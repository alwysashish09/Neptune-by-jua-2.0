/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Role {
  DATA_CENTER = "DATA_CENTER",
  HEAT_BUYER = "HEAT_BUYER",
  ADMIN = "ADMIN"
}

export enum ComplianceStatus {
  COMPLIANT = "COMPLIANT",
  AT_RISK = "AT_RISK",
  VIOLATION = "VIOLATION"
}

export enum MatchStatus {
  SUGGESTED = "SUGGESTED",
  PROPOSED = "PROPOSED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED"
}

export enum ContractStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SETTLED = "SETTLED",
  CANCELLED = "CANCELLED"
}

export enum OrgPlan {
  STARTER = "STARTER",
  GROWTH = "GROWTH",
  ENTERPRISE = "ENTERPRISE"
}

export enum SeatRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  VIEWER = "VIEWER"
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Facility {
  id: string;
  name: string;
  type: Role; // DATA_CENTER, HEAT_BUYER, etc.
  latitude: number;
  longitude: number;
  coolingSystemType?: string;
  ownerId: string;
  organizationId: string;
  createdAt: string;
  thermalProfile?: ThermalProfile;
  compliance?: ComplianceRecord;
}

export interface ThermalProfile {
  id: string;
  facilityId: string;
  currentExitTempC?: number;          // Source features
  currentLoadPercent?: number;          // Source features
  availableThermalOutputMWth?: number; // Source features
  requiredTempC?: number;              // Buyer features
  requiredVolumeGJ?: number;           // Buyer features
  updatedAt: string;
}

export interface ComplianceRecord {
  id: string;
  facilityId: string;
  currentERF: number;
  legalThresholdERF: number; // default 0.20
  daysToDeadline: number;
  status: ComplianceStatus;
  calculatedAt: string;
}

export interface Match {
  id: string;
  sourceFacilityId: string;
  buyerFacilityId: string;
  distanceKm: number;
  tempDropC: number;
  matchScore: number;
  status: MatchStatus;
  createdAt: string;
}

export interface Contract {
  id: string;
  matchId: string;
  status: ContractStatus;
  pricePerGJ: number;
  startDate: string;
  endDate?: string;
}

export interface ThermalDelivery {
  id: string;
  contractId: string;
  timestampStart: string;
  timestampEnd: string;
  gjDelivered: number;
  settledAmount: number;
  createdAt: string;
}

export interface CarbonCredit {
  id: string;
  deliveryId: string;
  gjOffset: number;
  certificateHash: string;
  issuedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  seatRole: SeatRole;
  invitedAt: string;
  acceptedAt?: string | null;
  email?: string;
}

export interface AppState {
  users: User[];
  facilities: Facility[];
  thermalProfiles: ThermalProfile[];
  complianceRecords: ComplianceRecord[];
  matches: Match[];
  contracts: Contract[];
  deliveries: ThermalDelivery[];
  carbonCredits: CarbonCredit[];
  organizations?: Organization[];
  orgMembers?: OrgMember[];
  markets: {
    id: string;
    name: string;
    pricePerGJ: number;
    deltaPercent: number;
  }[];
}
