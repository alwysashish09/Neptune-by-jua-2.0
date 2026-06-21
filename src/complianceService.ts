/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "./dbStore.js";
import { ComplianceRecord, ComplianceStatus, ContractStatus, MatchStatus, Role } from "./types.js";

/**
 * Recalculates compliance for a waste-heat producing facility (DATA_CENTER).
 */
export function recalculateCompliance(facilityId: string): ComplianceRecord {
  const facility = db.getFacilityById(facilityId);
  if (!facility) throw new Error(`Facility not found: ${facilityId}`);
  if (facility.type !== Role.DATA_CENTER) {
    throw new Error(`Only Heat-Producing Data Centers have compliance requirements: ${facilityId}`);
  }

  const profile = db.getThermalProfileByFacilityId(facilityId);
  const availableMWth = profile?.availableThermalOutputMWth ?? 0;

  // 1. Peak output over 30 days:
  // 1 MW = 1 MJ/sec.
  // 1 MW over 1 Hour = 3600 MJ = 3.6 GJ.
  // 30 Days of continuous peak capacity: MW * 3.6 * 24 * 30 = MW * 2592 GJ equivalent.
  const totalAvailableGJ_30d = availableMWth * 2592;

  // 2. Compute delivered gigajoules over rolling 30 days for contracts
  const now = new Date();
  const thirtyDaysAgo_ms = now.getTime() - 30 * 24 * 3600 * 1000;

  // Find all matches where facility is source and accepted
  const acceptedMatches = db.getMatches().filter(
    m => m.sourceFacilityId === facilityId && m.status === MatchStatus.ACCEPTED
  );
  const matchIds = acceptedMatches.map(m => m.id);

  // Find active contracts
  const activeContracts = db.getContracts().filter(
    c => matchIds.includes(c.matchId) && c.status === ContractStatus.ACTIVE
  );
  const contractIds = activeContracts.map(c => c.id);

  // Summarize deliveries
  let sumGjDelivered = 0;
  const state = db.getState();
  const deliveries = state.deliveries.filter(
    d => contractIds.includes(d.contractId)
  );

  for (const delivery of deliveries) {
    const dTime = new Date(delivery.timestampEnd).getTime();
    if (dTime >= thirtyDaysAgo_ms) {
      sumGjDelivered += delivery.gjDelivered;
    }
  }

  // 3. Compute Energy Reuse Factor (ERF)
  const currentERF = totalAvailableGJ_30d > 0 ? parseFloat((sumGjDelivered / totalAvailableGJ_30d).toFixed(4)) : 0;

  // 4. Determine regulatory alert status
  // Legal limit set to 20% by default, or loaded from existing record
  const existingRecord = db.getComplianceRecordByFacilityId(facilityId);
  const legalThresholdERF = existingRecord?.legalThresholdERF ?? 0.20;

  let status: ComplianceStatus = ComplianceStatus.VIOLATION;
  if (currentERF >= legalThresholdERF) {
    status = ComplianceStatus.COMPLIANT;
  } else if (currentERF >= 0.8 * legalThresholdERF) {
    status = ComplianceStatus.AT_RISK;
  }

  // 5. Days to Deadline (EU DDADUE target: December 31, 2026)
  const deadline = new Date("2026-12-31T23:59:59Z");
  const diffMs = deadline.getTime() - now.getTime();
  const daysToDeadline = Math.max(0, Math.floor(diffMs / (1000 * 3600 * 24)));

  const updatedRecord: ComplianceRecord = {
    id: existingRecord?.id ?? "compliance-" + Math.random().toString(36).substring(2, 11),
    facilityId,
    currentERF,
    legalThresholdERF,
    daysToDeadline,
    status,
    calculatedAt: now.toISOString()
  };

  db.saveComplianceRecord(updatedRecord);
  return updatedRecord;
}
