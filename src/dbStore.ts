/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from "fs";
import { 
  AppState, Role, ComplianceStatus, MatchStatus, ContractStatus, 
  User, Facility, ThermalProfile, ComplianceRecord, Match, Contract, ThermalDelivery, CarbonCredit,
  OrgPlan, SeatRole, Organization, OrgMember, CapsuleStatus, CapsuleID, CountrySequence, NetworkCounters
} from "./types.js";

const FILE_PATH = "./neptune_db.json";

export function lookupCountry(lat: number, lng: number): string {
  // India bounding box (approximate)
  if (lat >= 8 && lat <= 38 && lng >= 68 && lng <= 98) {
    return "IN";
  }
  // Germany bounding box (approximate)
  if (lat >= 47 && lat <= 55 && lng >= 5 && lng <= 16) {
    return "DE";
  }
  // United States bounding box (approximate)
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) {
    return "US";
  }
  return "IN"; // default fallback for MP
}

// Seed Data
const DEFAULT_STATE: AppState = {
  users: [
    {
      id: "dc-owner-user-id",
      email: "teamashish2005@gmail.com",
      passwordHash: "$2b$10$7zU1W7J9Vbe7H7rK3EAnbOE3B76mXj0o6aD8hF1QoH6U0Vw7nBqyO", // bhash of 'password123'
      role: Role.DATA_CENTER,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-owner-user-id",
      email: "buyer@neptune.io",
      passwordHash: "$2b$10$7zU1W7J9Vbe7H7rK3EAnbOE3B76mXj0o6aD8hF1QoH6U0Vw7nBqyO",
      role: Role.HEAT_BUYER,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "admin-user-id",
      email: "admin@neptune.io",
      passwordHash: "$2b$10$7zU1W7J9Vbe7H7rK3EAnbOE3B76mXj0o6aD8hF1QoH6U0Vw7nBqyO",
      role: Role.ADMIN,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    }
  ],
  organizations: [
    {
      id: "org-dc-owner-user-id",
      name: "Mandideep DC Org",
      plan: OrgPlan.ENTERPRISE,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "org-buyer-owner-user-id",
      name: "Union Thermal Buyers",
      plan: OrgPlan.GROWTH,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "org-admin-user-id",
      name: "Neptune Admin Org",
      plan: OrgPlan.ENTERPRISE,
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    }
  ],
  orgMembers: [
    {
      id: "m-dc-owner",
      organizationId: "org-dc-owner-user-id",
      userId: "dc-owner-user-id",
      seatRole: SeatRole.ADMIN,
      invitedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      acceptedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      email: "teamashish2005@gmail.com"
    },
    {
      id: "m-buyer-owner",
      organizationId: "org-buyer-owner-user-id",
      userId: "buyer-owner-user-id",
      seatRole: SeatRole.ADMIN,
      invitedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      acceptedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      email: "buyer@neptune.io"
    },
    {
      id: "m-admin-owner",
      organizationId: "org-admin-user-id",
      userId: "admin-user-id",
      seatRole: SeatRole.ADMIN,
      invitedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      acceptedAt: new Date("2026-06-01T00:00:00Z").toISOString(),
      email: "admin@neptune.io"
    }
  ],
  facilities: [
    {
      id: "dc-facility-1",
      name: "Mandideep Data Center",
      type: Role.DATA_CENTER,
      latitude: 23.0820,
      longitude: 77.5400,
      coolingSystemType: "Liquid-to-Air Heat Exchanger",
      ownerId: "dc-owner-user-id",
      organizationId: "org-dc-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-1",
      name: "Bhopal Municipal District Heating Pilot",
      type: Role.HEAT_BUYER,
      latitude: 23.0735,
      longitude: 77.5388,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-2",
      name: "Mandideep Vertical Farms Greenhouse",
      type: Role.HEAT_BUYER,
      latitude: 23.0890,
      longitude: 77.5310,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-03T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-3",
      name: "Kolar Road Water Treatment Plant",
      type: Role.HEAT_BUYER,
      latitude: 23.1120,
      longitude: 77.4280,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-05T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-4",
      name: "Mandideep Textile Processing Unit",
      type: Role.HEAT_BUYER,
      latitude: 23.0760,
      longitude: 77.5510,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-05T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-5",
      name: "Mandideep Community Swimming Complex",
      type: Role.HEAT_BUYER,
      latitude: 23.0865,
      longitude: 77.5455,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-06T00:00:00Z").toISOString()
    },
    // Pune Cluster
    {
      id: "dc-facility-pune",
      name: "Hinjawadi Phase 2 Data Center",
      type: Role.DATA_CENTER,
      latitude: 18.5908,
      longitude: 73.7387,
      coolingSystemType: "Direct Liquid Immersion Chassis",
      ownerId: "dc-owner-user-id",
      organizationId: "org-dc-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-pune-1",
      name: "Pimpri-Chinchwad Industrial Heating Co-op",
      type: Role.HEAT_BUYER,
      latitude: 18.6298,
      longitude: 73.7997,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-pune-2",
      name: "Wakad Greenhouse Cluster",
      type: Role.HEAT_BUYER,
      latitude: 18.5984,
      longitude: 73.7629,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    // Frankfurt Cluster
    {
      id: "dc-facility-frankfurt",
      name: "Frankfurt-Rödelheim Data Center",
      type: Role.DATA_CENTER,
      latitude: 50.1280,
      longitude: 8.6080,
      coolingSystemType: "Water-Cooled Coaxial Micro-Channels",
      ownerId: "dc-owner-user-id",
      organizationId: "org-dc-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-frankfurt-1",
      name: "Mainova District Heating Network",
      type: Role.HEAT_BUYER,
      latitude: 50.1155,
      longitude: 8.6842,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    },
    {
      id: "buyer-facility-frankfurt-2",
      name: "Höchst Industrial Park Heat Demand Unit",
      type: Role.HEAT_BUYER,
      latitude: 50.1010,
      longitude: 8.5400,
      ownerId: "buyer-owner-user-id",
      organizationId: "org-buyer-owner-user-id",
      createdAt: new Date("2026-06-01T00:00:00Z").toISOString()
    }
  ],
  thermalProfiles: [
    {
      id: "profile-dc-1",
      facilityId: "dc-facility-1",
      currentExitTempC: 64.0,
      currentLoadPercent: 78.0,
      availableThermalOutputMWth: 4.2,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-1",
      facilityId: "buyer-facility-1",
      requiredTempC: 55.0,
      requiredVolumeGJ: 180,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-2",
      facilityId: "buyer-facility-2",
      requiredTempC: 35.0,
      requiredVolumeGJ: 90,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-3",
      facilityId: "buyer-facility-3",
      requiredTempC: 60.0,
      requiredVolumeGJ: 220,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-4",
      facilityId: "buyer-facility-4",
      requiredTempC: 65.0,
      requiredVolumeGJ: 150,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-5",
      facilityId: "buyer-facility-5",
      requiredTempC: 30.0,
      requiredVolumeGJ: 40,
      updatedAt: new Date().toISOString()
    },
    // Pune profiles
    {
      id: "profile-dc-pune",
      facilityId: "dc-facility-pune",
      currentExitTempC: 68.0,
      currentLoadPercent: 85.0,
      availableThermalOutputMWth: 6.1,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-pune-1",
      facilityId: "buyer-facility-pune-1",
      requiredTempC: 58.0,
      requiredVolumeGJ: 300,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-pune-2",
      facilityId: "buyer-facility-pune-2",
      requiredTempC: 35.0,
      requiredVolumeGJ: 110,
      updatedAt: new Date().toISOString()
    },
    // Frankfurt profiles
    {
      id: "profile-dc-frankfurt",
      facilityId: "dc-facility-frankfurt",
      currentExitTempC: 60.0,
      currentLoadPercent: 72.0,
      availableThermalOutputMWth: 8.4,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-frankfurt-1",
      facilityId: "buyer-facility-frankfurt-1",
      requiredTempC: 50.0,
      requiredVolumeGJ: 500,
      updatedAt: new Date().toISOString()
    },
    {
      id: "profile-buyer-frankfurt-2",
      facilityId: "buyer-facility-frankfurt-2",
      requiredTempC: 62.0,
      requiredVolumeGJ: 410,
      updatedAt: new Date().toISOString()
    }
  ],
  complianceRecords: [
    {
      id: "compliance-dc-1",
      facilityId: "dc-facility-1",
      currentERF: 0.285, // 28.5% is recovered (Threshold: 20%)
      legalThresholdERF: 0.20,
      daysToDeadline: 194,
      status: ComplianceStatus.COMPLIANT,
      calculatedAt: new Date().toISOString()
    },
    {
      id: "compliance-dc-pune",
      facilityId: "dc-facility-pune",
      currentERF: 0.235,
      legalThresholdERF: 0.20,
      daysToDeadline: 194,
      status: ComplianceStatus.COMPLIANT,
      calculatedAt: new Date().toISOString()
    },
    {
      id: "compliance-dc-frankfurt",
      facilityId: "dc-facility-frankfurt",
      currentERF: 0.312,
      legalThresholdERF: 0.20,
      daysToDeadline: 194,
      status: ComplianceStatus.COMPLIANT,
      calculatedAt: new Date().toISOString()
    }
  ],
  matches: [
    {
      id: "match-1",
      sourceFacilityId: "dc-facility-1",
      buyerFacilityId: "buyer-facility-1",
      distanceKm: 0.96,
      tempDropC: 0.48, // 0.96 * 0.5
      matchScore: 92,
      status: MatchStatus.ACCEPTED,
      createdAt: new Date("2026-06-05T12:00:00Z").toISOString()
    },
    {
      id: "match-2",
      sourceFacilityId: "dc-facility-1",
      buyerFacilityId: "buyer-facility-2",
      distanceKm: 1.22,
      tempDropC: 0.61,
      matchScore: 85,
      status: MatchStatus.ACCEPTED,
      createdAt: new Date("2026-06-05T12:00:00Z").toISOString()
    },
    {
      id: "match-3",
      sourceFacilityId: "dc-facility-1",
      buyerFacilityId: "buyer-facility-3",
      distanceKm: 12.6,
      tempDropC: 6.3,
      matchScore: 25,
      status: MatchStatus.REJECTED,
      createdAt: new Date("2026-06-05T12:00:00Z").toISOString()
    },
    {
      id: "match-4",
      sourceFacilityId: "dc-facility-1",
      buyerFacilityId: "buyer-facility-4",
      distanceKm: 1.38,
      tempDropC: 0.69,
      matchScore: 45,
      status: MatchStatus.SUGGESTED,
      createdAt: new Date("2026-06-05T12:00:00Z").toISOString()
    },
    {
      id: "match-5",
      sourceFacilityId: "dc-facility-1",
      buyerFacilityId: "buyer-facility-5",
      distanceKm: 0.73,
      tempDropC: 0.37,
      matchScore: 95,
      status: MatchStatus.SUGGESTED,
      createdAt: new Date("2026-06-05T12:00:00Z").toISOString()
    }
  ],
  contracts: [
    {
      id: "contract-1",
      matchId: "match-1",
      status: ContractStatus.ACTIVE,
      pricePerGJ: 4.80, // EUR per GJ
      startDate: new Date("2026-06-01T00:00:00Z").toISOString(),
      endDate: new Date("2027-06-01T00:00:00Z").toISOString()
    },
    {
      id: "contract-2",
      matchId: "match-2",
      status: ContractStatus.ACTIVE,
      pricePerGJ: 6.20,
      startDate: new Date("2026-06-04T00:00:00Z").toISOString(),
      endDate: new Date("2027-06-04T00:00:00Z").toISOString()
    }
  ],
  deliveries: [], // Will populate in seeding
  carbonCredits: [], // Will populate in seeding
  markets: [
    { id: "m-de", name: "EU Heat Standard (EHS)", pricePerGJ: 5.42, deltaPercent: 1.2 },
    { id: "m-uk", name: "UK Green Grid Premium", pricePerGJ: 6.85, deltaPercent: -0.4 },
    { id: "m-in", name: "Bhopal Carbon-Offset Multiplier", pricePerGJ: 4.10, deltaPercent: 2.5 },
    { id: "m-us", name: "US District Therm Unit (DTU)", pricePerGJ: 5.15, deltaPercent: 0.8 }
  ]
};

// Auto-populate 14 days of historical deliveries & carbon credits for active contracts
// 14 days counting back from 2026-06-20 (today)
const populateSeededHistory = (state: AppState) => {
  const deliveries: ThermalDelivery[] = [];
  const carbonCredits: CarbonCredit[] = [];
  const today = new Date("2026-06-20T12:00:00Z");

  for (let i = 14; i >= 0; i--) {
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() - i);

    // Contract 1 Delivery
    const c1Id = "c1-del-" + i;
    const gj1 = 160 + Math.sin(i) * 20 + Math.random() * 10;
    const amount1 = gj1 * 4.80;
    const startStr1 = new Date(deliveryDate.getTime() - 2 * 3600 * 1000).toISOString(); // 2 hours duration
    const endStr1 = deliveryDate.toISOString();

    deliveries.push({
      id: c1Id,
      contractId: "contract-1",
      timestampStart: startStr1,
      timestampEnd: endStr1,
      gjDelivered: parseFloat(gj1.toFixed(2)),
      settledAmount: parseFloat(amount1.toFixed(2)),
      createdAt: endStr1
    });

    // Contract 2 Delivery
    const c2Id = "c2-del-" + i;
    const gj2 = 90 + Math.cos(i) * 15 + Math.random() * 8;
    const amount2 = gj2 * 6.20;
    const startStr2 = new Date(deliveryDate.getTime() - 4 * 3600 * 1000).toISOString(); // 4 hours duration
    const endStr2 = deliveryDate.toISOString();

    deliveries.push({
      id: c2Id,
      contractId: "contract-2",
      timestampStart: startStr2,
      timestampEnd: endStr2,
      gjDelivered: parseFloat(gj2.toFixed(2)),
      settledAmount: parseFloat(amount2.toFixed(2)),
      createdAt: endStr2
    });

    // Generate credit for Contract 1 on day 7 to represent seed requirements
    if (i === 7) {
      carbonCredits.push({
        id: "cc-seeded-1",
        deliveryId: c1Id,
        gjOffset: parseFloat((gj1 * 0.05).toFixed(2)), // 5% standard conversion ratio
        certificateHash: "cc8f731a55288bf2ee5b3648fa39feecdf2dc8f4762cfaf8862cf9ee8b19685a",
        issuedAt: endStr1
      });
    }
  }

  state.deliveries = deliveries;
  state.carbonCredits = carbonCredits;
};

// Setup initial state on import
populateSeededHistory(DEFAULT_STATE);

export class DBStore {
  private state: AppState;

  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, "utf8");
        this.state = JSON.parse(fileContent);
        this.migrate();
      } else {
        this.migrate();
        this.save();
      }
    } catch (e) {
      console.warn("Could not load database state, using memory-only database", e);
      this.migrate();
    }
  }

  private migrate() {
    if (!this.state.organizations) {
      this.state.organizations = [];
    }
    if (!this.state.orgMembers) {
      this.state.orgMembers = [];
    }

    // 1. Create default organizations for seeded owners
    const userOrgMap = new Map<string, string>();
    for (const u of this.state.users) {
      let existingMember = this.state.orgMembers.find(m => m.userId === u.id && m.seatRole === SeatRole.ADMIN);
      let orgId = "";
      if (existingMember) {
        orgId = existingMember.organizationId;
      } else {
        orgId = "org-" + u.id;
        const orgName = u.email === "teamashish2005@gmail.com" ? "Mandideep DC Org" :
                        u.email === "buyer@neptune.io" ? "Union Thermal Buyers" :
                        u.email === "admin@neptune.io" ? "Neptune Admin Org" :
                        `${u.email.split("@")[0]}'s Organization`;
        const plan = u.role === Role.ADMIN ? OrgPlan.ENTERPRISE :
                     u.role === Role.DATA_CENTER ? OrgPlan.GROWTH : OrgPlan.STARTER;

        if (!this.state.organizations.some(o => o.id === orgId)) {
          this.state.organizations.push({
            id: orgId,
            name: orgName,
            plan,
            createdAt: u.createdAt || new Date().toISOString()
          });
        }

        this.state.orgMembers.push({
          id: "m-" + Math.random().toString(36).substring(2, 11),
          organizationId: orgId,
          userId: u.id,
          seatRole: SeatRole.ADMIN,
          invitedAt: u.createdAt || new Date().toISOString(),
          acceptedAt: u.createdAt || new Date().toISOString(),
          email: u.email
        });
      }
      userOrgMap.set(u.id, orgId);
    }

    // 2. Map facilities to organizationId if missing
    for (const f of this.state.facilities) {
      if (!f.organizationId) {
        const orgId = userOrgMap.get(f.ownerId) || "org-dc-owner-user-id";
        f.organizationId = orgId;
      }
    }

    // 3. Make sure all high-end / multi-region facilities are in state
    const defaultFacilities = DEFAULT_STATE.facilities;
    for (const df of defaultFacilities) {
      const matchInState = this.state.facilities.find(f => f.id === df.id);
      if (!matchInState) {
        const orgId = df.ownerId === "dc-owner-user-id" ? "org-dc-owner-user-id" : "org-buyer-owner-user-id";
        this.state.facilities.push({
          ...df,
          organizationId: this.state.organizations.some(o => o.id === orgId) ? orgId : (this.state.organizations[0]?.id || "org-dc-owner-user-id")
        });

        const dp = DEFAULT_STATE.thermalProfiles.find(p => p.facilityId === df.id);
        if (dp && !this.state.thermalProfiles.some(p => p.facilityId === df.id)) {
          this.state.thermalProfiles.push(dp);
        }

        const dc = DEFAULT_STATE.complianceRecords.find(c => c.facilityId === df.id);
        if (dc && !this.state.complianceRecords.some(c => c.facilityId === df.id)) {
          this.state.complianceRecords.push(dc);
        }
      } else {
        matchInState.name = df.name;
        matchInState.latitude = df.latitude;
        matchInState.longitude = df.longitude;
        if (df.coolingSystemType) {
          matchInState.coolingSystemType = df.coolingSystemType;
        }

        const dp = DEFAULT_STATE.thermalProfiles.find(p => p.facilityId === df.id);
        const pInState = this.state.thermalProfiles.find(p => p.facilityId === df.id);
        if (dp && pInState) {
          pInState.requiredTempC = dp.requiredTempC;
          pInState.requiredVolumeGJ = dp.requiredVolumeGJ;
          pInState.currentExitTempC = dp.currentExitTempC;
          pInState.currentLoadPercent = dp.currentLoadPercent;
          pInState.availableThermalOutputMWth = dp.availableThermalOutputMWth;
        }
      }
    }

    // 4. Initialize capsule ID structures
    if (!this.state.capsuleIDs) {
      this.state.capsuleIDs = [];
    }
    if (!this.state.countrySequences) {
      this.state.countrySequences = [];
    }

    // Ensure country code on existing facilities
    for (const f of this.state.facilities) {
      if (!f.countryCode) {
        f.countryCode = lookupCountry(f.latitude, f.longitude);
      }
    }

    // Seed capsule IDs for existing facilities if empty
    if (this.state.capsuleIDs.length === 0) {
      for (const f of this.state.facilities) {
        const prefix = f.type === Role.DATA_CENTER ? "NDC" : "NHB";
        const year = "2026";
        const cCode = f.countryCode || "IN";

        let seqRow = this.state.countrySequences.find(s => s.countryCode === cCode);
        if (!seqRow) {
          seqRow = { countryCode: cCode, nextSequence: 1 };
          this.state.countrySequences.push(seqRow);
        }

        const seq = seqRow.nextSequence++;
        const padded = String(seq).padStart(4, "0");
        const capsuleCode = `${prefix}-${year}-${cCode}-${padded}`;
        const publicProfileSlug = capsuleCode.toLowerCase();

        this.state.capsuleIDs.push({
          id: "cap-" + Math.random().toString(36).substring(2, 11),
          capsuleCode,
          facilityId: f.id,
          publicProfileSlug,
          status: CapsuleStatus.ACTIVE,
          onChainAnchored: true,
          onChainTxHash: "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 10),
          issuedAt: f.createdAt || new Date().toISOString()
        });
      }
    }

    // Reset next sequences to match current capsule counts so there is no collision
    for (const cCode of ["IN", "DE", "US"]) {
      const matchCount = this.state.capsuleIDs.filter(c => c.capsuleCode.split("-")[2] === cCode).length;
      const seqRow = this.state.countrySequences.find(s => s.countryCode === cCode);
      if (seqRow) {
        seqRow.nextSequence = Math.max(seqRow.nextSequence, matchCount + 1);
      } else {
        this.state.countrySequences.push({ countryCode: cCode, nextSequence: matchCount + 1 });
      }
    }

    // Initialize/update Network Counters
    this.recalculateNetworkCounters();

    this.save();
  }

  public save() {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.state, null, 2), "utf8");
    } catch (e) {
      console.warn("Could not persist database state", e);
    }
  }

  public getState(): AppState {
    return this.state;
  }

  // Organization Operations
  public getOrganizations(): Organization[] {
    return this.state.organizations || [];
  }

  public getOrganizationById(id: string): Organization | undefined {
    return this.getOrganizations().find(o => o.id === id);
  }

  public updateOrganizationPlan(id: string, plan: OrgPlan) {
    const org = this.getOrganizationById(id);
    if (org) {
      org.plan = plan;
      this.save();
    }
  }

  public getOrgMembers(): OrgMember[] {
    return this.state.orgMembers || [];
  }

  public createOrganization(userId: string, name: string, plan: OrgPlan = OrgPlan.STARTER): Organization {
    const orgId = "org-" + Math.random().toString(36).substring(2, 11);
    const user = this.getUserById(userId);
    const newOrg: Organization = {
      id: orgId,
      name,
      plan,
      createdAt: new Date().toISOString()
    };
    if (!this.state.organizations) this.state.organizations = [];
    this.state.organizations.push(newOrg);

    if (!this.state.orgMembers) this.state.orgMembers = [];
    this.state.orgMembers.push({
      id: "m-" + Math.random().toString(36).substring(2, 11),
      organizationId: orgId,
      userId,
      seatRole: SeatRole.ADMIN,
      invitedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      email: user?.email
    });

    this.save();
    return newOrg;
  }

  public createOrgMember(organizationId: string, email: string, seatRole: SeatRole, acceptedUserId?: string): OrgMember {
    const memberId = "m-" + Math.random().toString(36).substring(2, 11);
    const member: OrgMember = {
      id: memberId,
      organizationId,
      userId: acceptedUserId || "",
      seatRole,
      invitedAt: new Date().toISOString(),
      acceptedAt: acceptedUserId ? new Date().toISOString() : null,
      email: email.toLowerCase()
    };
    if (!this.state.orgMembers) this.state.orgMembers = [];
    this.state.orgMembers.push(member);
    this.save();
    return member;
  }

  public acceptOrgMemberInvitation(memberId: string, userId: string): OrgMember | undefined {
    // Find matching member by memberId, or by email of the user if they were invited
    const user = this.getUserById(userId);
    let targetMember = this.getOrgMembers().find(m => m.id === memberId);
    if (!targetMember && user) {
      targetMember = this.getOrgMembers().find(m => m.email?.toLowerCase() === user.email.toLowerCase() && !m.acceptedAt);
    }
    if (targetMember) {
      targetMember.userId = userId;
      targetMember.acceptedAt = new Date().toISOString();
      this.save();
      return targetMember;
    }
    return undefined;
  }

  public updateOrgMemberSeatRole(organizationId: string, userId: string, seatRole: SeatRole): OrgMember | undefined {
    const member = this.getOrgMembers().find(m => m.organizationId === organizationId && m.userId === userId);
    if (member) {
      member.seatRole = seatRole;
      this.save();
      return member;
    }
    return undefined;
  }

  public deleteOrgMember(organizationId: string, userId: string): boolean {
    if (!this.state.orgMembers) return false;
    const initialLen = this.state.orgMembers.length;
    this.state.orgMembers = this.state.orgMembers.filter(m => !(m.organizationId === organizationId && m.userId === userId));
    this.save();
    return this.state.orgMembers.length < initialLen;
  }

  // Auth Operations
  public getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(email: string, passwordHash: string, role: Role): User {
    const newUser: User = {
      id: "u-" + Math.random().toString(36).substring(2, 11),
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString()
    };
    this.state.users.push(newUser);
    
    // Automatically create a default organization for a newly registered user
    const userOrgId = "org-" + newUser.id;
    const orgName = `${email.split("@")[0]}'s Organization`;
    const plan = role === Role.ADMIN ? OrgPlan.ENTERPRISE :
                 role === Role.DATA_CENTER ? OrgPlan.GROWTH : OrgPlan.STARTER;
    
    if (!this.state.organizations) this.state.organizations = [];
    this.state.organizations.push({
      id: userOrgId,
      name: orgName,
      plan,
      createdAt: new Date().toISOString()
    });

    if (!this.state.orgMembers) this.state.orgMembers = [];
    this.state.orgMembers.push({
      id: "m-" + Math.random().toString(36).substring(2, 11),
      organizationId: userOrgId,
      userId: newUser.id,
      seatRole: SeatRole.ADMIN,
      invitedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
      email: email
    });

    this.save();
    return newUser;
  }

  // Facility Operations
  public getFacilities(): Facility[] {
    return this.state.facilities;
  }

  public getFacilityById(id: string): Facility | undefined {
    return this.state.facilities.find(f => f.id === id);
  }

  public getThermalProfileByFacilityId(facilityId: string): ThermalProfile | undefined {
    return this.state.thermalProfiles.find(tp => tp.facilityId === facilityId);
  }

  public createFacility(name: string, type: Role, latitude: number, longitude: number, coolingSystemType: string | undefined, ownerId: string, organizationId?: string): Facility {
    const facilityId = "f-" + Math.random().toString(36).substring(2, 11);
    
    // Resolve organizationId
    let resolvedOrgId = organizationId;
    if (!resolvedOrgId) {
      const existingMember = this.getOrgMembers().find(m => m.userId === ownerId);
      resolvedOrgId = existingMember ? existingMember.organizationId : "org-" + ownerId;
    }

    const newFacility: Facility = {
      id: facilityId,
      name,
      type,
      latitude,
      longitude,
      coolingSystemType,
      ownerId,
      organizationId: resolvedOrgId,
      createdAt: new Date().toISOString()
    };

    const newProfile: ThermalProfile = {
      id: "p-" + Math.random().toString(36).substring(2, 11),
      facilityId,
      updatedAt: new Date().toISOString()
    };

    if (type === Role.DATA_CENTER) {
      newProfile.currentExitTempC = 60.0;
      newProfile.currentLoadPercent = 50.0;
      newProfile.availableThermalOutputMWth = 8.0;
    } else {
      newProfile.requiredTempC = 40.0;
      newProfile.requiredVolumeGJ = 5000;
    }

    this.state.facilities.push(newFacility);
    this.state.thermalProfiles.push(newProfile);

    // Bootstrap initial compliance record
    if (type === Role.DATA_CENTER) {
      this.state.complianceRecords.push({
        id: "c-" + Math.random().toString(36).substring(2, 11),
        facilityId,
        currentERF: 0,
        legalThresholdERF: 0.20,
        daysToDeadline: 194,
        status: ComplianceStatus.VIOLATION,
        calculatedAt: new Date().toISOString()
      });
    }

    this.save();
    return newFacility;
  }

  public updateThermalProfile(facilityId: string, updates: Partial<ThermalProfile>): ThermalProfile {
    let profile = this.getThermalProfileByFacilityId(facilityId);
    if (!profile) {
      profile = {
        id: "p-" + Math.random().toString(36).substring(2, 11),
        facilityId,
        updatedAt: new Date().toISOString()
      };
      this.state.thermalProfiles.push(profile);
    }

    Object.assign(profile, updates);
    profile.updatedAt = new Date().toISOString();
    this.save();
    return profile;
  }

  // Compliance Operations
  public getComplianceRecordByFacilityId(facilityId: string): ComplianceRecord | undefined {
    return this.state.complianceRecords.find(cr => cr.facilityId === facilityId);
  }

  public saveComplianceRecord(cr: ComplianceRecord) {
    const idx = this.state.complianceRecords.findIndex(r => r.id === cr.id);
    if (idx !== -1) {
      this.state.complianceRecords[idx] = cr;
    } else {
      this.state.complianceRecords.push(cr);
    }
    this.save();
  }

  // Matches
  public getMatches(): Match[] {
    return this.state.matches;
  }

  public getMatchById(id: string): Match | undefined {
    return this.state.matches.find(m => m.id === id);
  }

  public getContracts(): Contract[] {
    return this.state.contracts;
  }

  public getContractById(id: string): Contract | undefined {
    return this.state.contracts.find(c => c.id === id);
  }

  public getDeliveriesByContractId(contractId: string): ThermalDelivery[] {
    return this.state.deliveries.filter(d => d.contractId === contractId);
  }

  public createMatch(match: Match) {
    this.state.matches.push(match);
    this.save();
  }

  public updateMatchStatus(matchId: string, status: MatchStatus) {
    const match = this.getMatchById(matchId);
    if (match) {
      match.status = status;
      this.save();
    }
  }

  public createContract(matchId: string, pricePerGJ: number, startDate: string, endDate?: string): Contract {
    const match = this.getMatchById(matchId);
    if (!match) throw new Error("Match not found");

    match.status = MatchStatus.ACCEPTED;

    const contract: Contract = {
      id: "contract-" + Math.random().toString(36).substring(2, 11),
      matchId,
      status: ContractStatus.ACTIVE,
      pricePerGJ,
      startDate,
      endDate
    };

    this.state.contracts.push(contract);
    this.save();
    return contract;
  }

  public createThermalDelivery(contractId: string, gjDelivered: number, settledAmount: number, timestampStart: string, timestampEnd: string): ThermalDelivery {
    const delivery: ThermalDelivery = {
      id: "del-" + Math.random().toString(36).substring(2, 11),
      contractId,
      timestampStart,
      timestampEnd,
      gjDelivered,
      settledAmount,
      createdAt: new Date().toISOString()
    };
    this.state.deliveries.push(delivery);
    this.save();
    return delivery;
  }

  public createCarbonCredit(deliveryId: string, gjOffset: number, certificateHash: string): CarbonCredit {
    const cc: CarbonCredit = {
      id: "cc-" + Math.random().toString(36).substring(2, 11),
      deliveryId,
      gjOffset,
      certificateHash,
      issuedAt: new Date().toISOString()
    };
    this.state.carbonCredits.push(cc);
    this.save();
    return cc;
  }

  public getCarbonCredits(): CarbonCredit[] {
    return this.state.carbonCredits;
  }

  public getCapsuleIDs(): CapsuleID[] {
    return this.state.capsuleIDs || [];
  }

  public getCapsuleById(id: string): CapsuleID | undefined {
    return this.state.capsuleIDs?.find(c => c.id === id);
  }

  public getCapsuleBySlug(slug: string): CapsuleID | undefined {
    return this.state.capsuleIDs?.find(c => c.publicProfileSlug === slug.toLowerCase());
  }

  public getCapsuleByFacilityId(facilityId: string): CapsuleID | undefined {
    return this.state.capsuleIDs?.find(c => c.facilityId === facilityId);
  }

  public getNetworkCounters(): NetworkCounters {
    if (!this.state.networkCounters) {
      this.recalculateNetworkCounters();
    }
    return this.state.networkCounters!;
  }

  public recalculateNetworkCounters(): NetworkCounters {
    const totalCapsules = this.state.capsuleIDs ? this.state.capsuleIDs.filter(c => c.status === CapsuleStatus.ACTIVE).length : 0;
    
    let totalGjTraded = 0;
    // Sum gjDelivered across all contracts
    const activeContracts = this.state.contracts;
    for (const contract of activeContracts) {
      const dels = this.state.deliveries.filter(d => d.contractId === contract.id);
      totalGjTraded += dels.reduce((sum, d) => sum + d.gjDelivered, 0);
    }

    // Liter of water offset: as derived from energy swap avoided cooling tower water evaporation.
    // Fixed standard ratio: 15.5 liters of freshwater preserved per single GJ of reused thermal volume.
    const totalLitersWaterOffset = totalGjTraded * 15.5;

    // CO2 avoided in kg: standard avoided fossil heating emission factor.
    // Factor selection: 50 kg of avoided CO2 greenhouse gases per single GJ of heat recycled.
    const totalCo2AvoidedKg = totalGjTraded * 50;

    const counters: NetworkCounters = {
      id: "global",
      totalCapsules,
      totalGjTraded: parseFloat(totalGjTraded.toFixed(2)),
      totalLitersWaterOffset: parseFloat(totalLitersWaterOffset.toFixed(2)),
      totalCo2AvoidedKg: parseFloat(totalCo2AvoidedKg.toFixed(2)),
      lastUpdated: new Date().toISOString()
    };

    this.state.networkCounters = counters;
    this.save();
    return counters;
  }

  public generateCapsuleId(countryCode: string, facilityType: string): { capsuleCode: string, publicProfileSlug: string } {
    if (!this.state.countrySequences) {
      this.state.countrySequences = [];
    }

    const prefix = facilityType === "DATA_CENTER" ? "NDC" : "NHB";
    const year = new Date().getFullYear().toString();
    const cCode = countryCode.toUpperCase();

    let seqRow = this.state.countrySequences.find(s => s.countryCode === cCode);
    if (!seqRow) {
      seqRow = { countryCode: cCode, nextSequence: 1 };
      this.state.countrySequences.push(seqRow);
    }

    const currentSeq = seqRow.nextSequence;
    seqRow.nextSequence += 1;

    const padded = String(currentSeq).padStart(4, "0");
    const capsuleCode = `${prefix}-${year}-${cCode}-${padded}`;
    const publicProfileSlug = capsuleCode.toLowerCase();

    this.save();
    return { capsuleCode, publicProfileSlug };
  }

  public createDraftFacilityAndCapsule(facilityName: string, type: Role, latitude: number, longitude: number): { facility: Facility, capsule: CapsuleID } {
    const fId = "f-draft-" + Math.random().toString(36).substring(2, 11);
    const countryCode = lookupCountry(latitude, longitude);

    const facility: Facility = {
      id: fId,
      name: facilityName,
      type,
      latitude,
      longitude,
      ownerId: "draft-user",
      organizationId: "draft-org",
      createdAt: new Date().toISOString(),
      countryCode
    };

    const { capsuleCode, publicProfileSlug } = this.generateCapsuleId(countryCode, type);

    const capsule: CapsuleID = {
      id: "cap-draft-" + Math.random().toString(36).substring(2, 11),
      capsuleCode,
      facilityId: fId,
      publicProfileSlug,
      status: CapsuleStatus.PENDING_VERIFICATION,
      onChainAnchored: true,
      onChainTxHash: "0x" + Math.random().toString(16).substring(2, 10) + "..." + Math.random().toString(16).substring(2, 10),
      issuedAt: new Date().toISOString()
    };

    if (!this.state.capsuleIDs) {
      this.state.capsuleIDs = [];
    }

    this.state.facilities.push(facility);
    this.state.capsuleIDs.push(capsule);

    const newProfile: ThermalProfile = {
      id: "p-draft-" + Math.random().toString(36).substring(2, 11),
      facilityId: fId,
      updatedAt: new Date().toISOString()
    };
    if (type === Role.DATA_CENTER) {
      newProfile.currentExitTempC = 60.0;
      newProfile.currentLoadPercent = 50.0;
      newProfile.availableThermalOutputMWth = 8.0;
    } else {
      newProfile.requiredTempC = 40.0;
      newProfile.requiredVolumeGJ = 5000;
    }
    this.state.thermalProfiles.push(newProfile);

    if (type === Role.DATA_CENTER) {
      this.state.complianceRecords.push({
        id: "c-draft-" + Math.random().toString(36).substring(2, 11),
        facilityId: fId,
        currentERF: 0,
        legalThresholdERF: 0.20,
        daysToDeadline: 194,
        status: ComplianceStatus.VIOLATION,
        calculatedAt: new Date().toISOString()
      });
    }

    this.recalculateNetworkCounters();
    this.save();
    return { facility, capsule };
  }
}

// Global Export
export const db = new DBStore();
