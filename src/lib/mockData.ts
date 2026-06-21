// mockData.ts
import { AppState, Role, SeatRole, OrgPlan, MatchStatus, ContractStatus, ComplianceStatus } from '../types';

export const generateMockData = (): AppState => {
  const now = new Date();
  
  const org1Id = `org_${Math.random().toString(36).substring(2, 11)}`;
  const org2Id = `org_${Math.random().toString(36).substring(2, 11)}`;

  const mockState: AppState = {
    organizations: [
      {
        id: org1Id,
        name: "Mock Data Center Corp",
        plan: OrgPlan.ENTERPRISE,
        createdAt: now.toISOString(),
      },
      {
        id: org2Id,
        name: "Mock District Heating",
        plan: OrgPlan.GROWTH,
        createdAt: now.toISOString(),
      }
    ],
    orgMembers: [
      {
        id: `member_${Math.random().toString(36).substring(2, 11)}`,
        organizationId: org1Id,
        userId: "mock_admin_1",
        seatRole: SeatRole.ADMIN,
        invitedAt: now.toISOString(),
        acceptedAt: now.toISOString(),
        email: "admin@mockdc.com"
      },
      {
        id: `member_${Math.random().toString(36).substring(2, 11)}`,
        organizationId: org2Id,
        userId: "mock_admin_2",
        seatRole: SeatRole.ADMIN,
        invitedAt: now.toISOString(),
        acceptedAt: now.toISOString(),
        email: "admin@mockheating.com"
      }
    ],
    facilities: [
      {
        id: "mock_facility_dc_1",
        name: "Mock DC Alpha",
        type: Role.DATA_CENTER,
        latitude: 39.0438,
        longitude: -77.4874,
        coolingSystemType: "Air-Water Exchanger",
        ownerId: "mock_admin_1",
        organizationId: org1Id,
        createdAt: now.toISOString(),
      },
      {
        id: "mock_facility_buyer_1",
        name: "Mock Heating Network Alpha",
        type: Role.HEAT_BUYER,
        latitude: 39.0550,
        longitude: -77.4950,
        ownerId: "mock_admin_2",
        organizationId: org2Id,
        createdAt: now.toISOString(),
      }
    ],
    thermalProfiles: [
      {
        id: "mock_profile_dc_1",
        facilityId: "mock_facility_dc_1",
        currentExitTempC: 58.5,
        currentLoadPercent: 92.0,
        availableThermalOutputMWth: 15.0,
        updatedAt: now.toISOString()
      },
      {
        id: "mock_profile_buyer_1",
        facilityId: "mock_facility_buyer_1",
        requiredTempC: 50.0,
        requiredVolumeGJ: 900,
        updatedAt: now.toISOString()
      }
    ],
    complianceRecords: [
      {
        id: "mock_compliance_dc_1",
        facilityId: "mock_facility_dc_1",
        currentERF: 0.22,
        legalThresholdERF: 0.20,
        daysToDeadline: 180,
        status: ComplianceStatus.COMPLIANT,
        calculatedAt: now.toISOString()
      }
    ],
    matches: [
      {
        id: "mock_match_1",
        sourceFacilityId: "mock_facility_dc_1",
        buyerFacilityId: "mock_facility_buyer_1",
        distanceKm: 1.25,
        tempDropC: 0.6,
        matchScore: 98,
        status: MatchStatus.ACCEPTED,
        createdAt: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
      }
    ],
    contracts: [
      {
        id: "mock_contract_1",
        matchId: "mock_match_1",
        status: ContractStatus.ACTIVE,
        pricePerGJ: 5.50,
        startDate: new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString(),
        endDate: new Date(now.getTime() + 365 * 24 * 3600 * 1000).toISOString()
      }
    ],
    deliveries: [],
    carbonCredits: [],
    marketRates: [
       { id: "m-eu", name: "EU Green Grid Standard", pricePerGJ: 5.40, deltaPercent: 1.2 },
       { id: "m-uk", name: "UK Green Grid Premium", pricePerGJ: 6.85, deltaPercent: -0.4 },
       { id: "m-us", name: "US District Therm Unit (DTU)", pricePerGJ: 5.15, deltaPercent: 0.8 }
    ],
    billingHistory: []
  };

  // Generate some deliveries and carbon credits
  for (let i = 14; i >= 0; i--) {
     const deliveryDate = new Date(now.getTime() - i * 24 * 3600 * 1000);
     const startStr = new Date(deliveryDate.getTime() - 6 * 3600 * 1000).toISOString();
     const endStr = deliveryDate.toISOString();
     const gj = 250 + Math.random() * 50;
     const amount = gj * 5.50;
     const deliveryId = `mock_del_${i}`;

     mockState.deliveries.push({
        id: deliveryId,
        contractId: "mock_contract_1",
        timestampStart: startStr,
        timestampEnd: endStr,
        gjDelivered: parseFloat(gj.toFixed(2)),
        settledAmount: parseFloat(amount.toFixed(2)),
        createdAt: endStr,
        transactionFeePaid: true,
        transactionFeeAmount: parseFloat((amount * 0.05).toFixed(2))
     });

     if (i % 3 === 0) {
        mockState.carbonCredits.push({
           id: `mock_cc_${i}`,
           deliveryId: deliveryId,
           gjOffset: parseFloat((gj * 0.05).toFixed(2)),
           certificateHash: "cc" + Math.random().toString(16).substring(2, 10),
           issuedAt: endStr
        });
     }
  }

  return mockState;
};
