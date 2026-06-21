/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PolicyStatus {
  SIMULATING = "SIMULATING",
  TRAINING = "TRAINING",
  DEPLOYED = "DEPLOYED",
  PAUSED = "PAUSED"
}

export interface CoolingPolicy {
  id: string;
  facilityId: string;
  modelVersion: string;     // default "aqua-rl-v1"
  status: PolicyStatus;     // default SIMULATING
  trainingEpisodes: number;
  cumulativeWaterSavedLiters: number;
  cumulativeFreshwaterAvoidedLiters: number;
  baselineComparisonLiters: number;
  lastTrainedAt?: string;
  createdAt: string;
}

export interface CoolingDecisionLog {
  id: string;
  facilityId: string;
  timestamp: string;
  observedTempC: number;
  observedLoadPercent: number;
  recycledTankLevelPercent?: number;
  freshwaterTankLevelPercent?: number;
  ambientTempC?: number;
  pumpFlowRatePercent: number;
  recycledRatio: number;
  safetyOverrideTriggered: boolean;
  rewardSignal?: number;
  source?: string;
}

export interface WaterProfile {
  id: string;
  facilityId: string;
  recycledTankLevelPercent: number;
  freshwaterTankLevelPercent: number;
  ambientTempC: number;
  updatedAt: string;
}

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
  countryCode?: string;
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
  transactionFeePaid?: boolean;
  transactionFeeAmount?: number;
  razorpayPaymentId?: string;
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
  billingHistory?: {
    id: string;
    organizationId: string;
    amount: number;
    purpose: string;
    plan: string;
    paymentId: string;
    date: string;
    status: string;
  }[];
  capsuleIDs?: CapsuleID[];
  countrySequences?: CountrySequence[];
  networkCounters?: NetworkCounters;
  coolingPolicies?: CoolingPolicy[];
  coolingDecisionLogs?: CoolingDecisionLog[];
  waterProfiles?: WaterProfile[];
}

export enum CapsuleStatus {
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED"
}

export interface CapsuleID {
  id: string;
  capsuleCode: string;          // "NDC-2026-IN-0247"
  facilityId: string;
  publicProfileSlug: string;    // "ndc-2026-in-0247"
  status: CapsuleStatus;
  onChainAnchored: boolean;
  onChainTxHash?: string;
  issuedAt: string;
}

export interface CountrySequence {
  countryCode: string;          // "IN", "DE", "US"
  nextSequence: number;
}

export interface NetworkCounters {
  id: string;                   // "global"
  totalCapsules: number;
  totalGjTraded: number;
  totalLitersWaterOffset: number;
  totalCo2AvoidedKg: number;
  lastUpdated: string;
}
