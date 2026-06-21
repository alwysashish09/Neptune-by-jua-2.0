/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "./dbStore.js";
import { Match, MatchStatus, Role } from "./types.js";

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using the Haversine formula.
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const clamp = (val: number, min: number, max: number): number => Math.min(Math.max(val, min), max);

/**
 * Executes matching algorithm for a given waste-heat source facility.
 */
export function findMatches(sourceFacilityId: string, radiusKm: number): Match[] {
  const source = db.getFacilityById(sourceFacilityId);
  if (!source) throw new Error(`Source facility not found: ${sourceFacilityId}`);
  if (source.type !== Role.DATA_CENTER) {
    throw new Error(`The source facility is not a Data Center (heat supplier): ${sourceFacilityId}`);
  }

  const sourceProfile = db.getThermalProfileByFacilityId(sourceFacilityId);
  if (!sourceProfile) throw new Error(`Source thermal profile is unassigned: ${sourceFacilityId}`);

  const sourceExitTemp = sourceProfile.currentExitTempC ?? 0;
  const sourceMWth = sourceProfile.availableThermalOutputMWth ?? 0;

  // 1. Filter buyers
  const facilities = db.getFacilities();
  const candidates = facilities.filter(f => f.type === Role.HEAT_BUYER && f.id !== sourceFacilityId);

  const results: Match[] = [];

  for (const buyer of candidates) {
    const distanceKm = getDistanceKm(source.latitude, source.longitude, buyer.latitude, buyer.longitude);
    
    // Discard if outside search radius
    if (distanceKm > radiusKm) continue;

    const buyerProfile = db.getThermalProfileByFacilityId(buyer.id);
    if (!buyerProfile) continue;

    const reqTemp = buyerProfile.requiredTempC ?? 0;
    const reqVolume = buyerProfile.requiredVolumeGJ ?? 0;

    // Heat loss metric: 0.5°C lost per km of pipeline
    const estimatedLoss = distanceKm * 0.5;
    const effectiveTemp = sourceExitTemp - estimatedLoss;

    // Discard immediately if heat delivered is colder than requested temperature profile
    if (effectiveTemp < reqTemp) continue;

    // Scores
    const tempDelta = effectiveTemp - reqTemp;
    const tempCompatibility = clamp(1 - tempDelta / 30, 0, 1);
    
    const proximityScore = clamp(1 - distanceKm / radiusKm, 0, 1);

    // Volume Fit Score: ratio of buyer requirements to available output
    const availableGJ_equiv = sourceMWth * 24 * 3.6; // daily thermal equivalent in GJ
    const volumeFitScore = clamp(
      Math.min(availableGJ_equiv, reqVolume) / Math.max(availableGJ_equiv, reqVolume) || 0,
      0,
      1
    );

    // Composite Weighted Match Score
    const rawScore = (tempCompatibility * 0.4 + proximityScore * 0.35 + volumeFitScore * 0.25) * 100;
    const matchScore = Math.round(rawScore);

    // Upsert into Match list with SUGGESTED state if not already existing
    const existingMatch = db.getMatches().find(
      m => m.sourceFacilityId === sourceFacilityId && m.buyerFacilityId === buyer.id
    );

    if (existingMatch) {
      existingMatch.distanceKm = parseFloat(distanceKm.toFixed(2));
      existingMatch.tempDropC = parseFloat(estimatedLoss.toFixed(2));
      existingMatch.matchScore = matchScore;
      results.push(existingMatch);
    } else {
      const newMatch: Match = {
        id: "m-" + Math.random().toString(36).substring(2, 11),
        sourceFacilityId,
        buyerFacilityId: buyer.id,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        tempDropC: parseFloat(estimatedLoss.toFixed(2)),
        matchScore,
        status: MatchStatus.SUGGESTED,
        createdAt: new Date().toISOString()
      };
      db.createMatch(newMatch);
      results.push(newMatch);
    }
  }

  // Sort descending by highest score
  const sorted = results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  db.save();
  return sorted;
}
