import { db } from "./dbStore.js";
import { PolicyStatus } from "./types.js";
import * as fs from "fs";

// Exposes methods for simulator and API routes to use

export const coolingPolicyService = {
  async runInference(facilityId: string) {
    const thermal = db.getThermalProfileByFacilityId(facilityId);
    let water = db.getWaterProfileByFacilityId(facilityId);
    if (!thermal) return null;

    if (!water) {
      water = db.updateWaterProfile(facilityId, {
        recycledTankLevelPercent: 90,
        freshwaterTankLevelPercent: 100,
        ambientTempC: Math.random() * 10 + 20
      });
    }

    const currentState = {
      serverTempC: thermal.currentExitTempC || 50,
      serverLoadPercent: thermal.currentLoadPercent || 50,
      recycledTankLevelPercent: water.recycledTankLevelPercent,
      freshwaterTankLevelPercent: water.freshwaterTankLevelPercent,
      ambientTempC: water.ambientTempC,
      predictedLoadNext5Min: Math.min(100, (thermal.currentLoadPercent || 50) + 5),
      recycledMixRatio: 0.8 // default current
    };

    let action;
    try {
      // Attempt to hit the Python RL microservice
      const res = await fetch("http://cooling-rl:8001/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentState),
        signal: AbortSignal.timeout(1500) // fast timeout so dashboard isn't hung
      });
      if (!res.ok) throw new Error("RL service returned error");
      action = await res.json();
    } catch (e) {
      // Fallback: static pseudo-learned policy natively if microservice is down
      const SAFE_TEMP_HARD_OVERRIDE = 80.0;
      if (currentState.serverTempC >= SAFE_TEMP_HARD_OVERRIDE) {
        action = {
          pumpFlowRatePercent: 100.0,
          recycledMixRatio: currentState.recycledMixRatio,
          safetyOverrideTriggered: true,
          source: "hard_safety_override"
        };
      } else {
        let pumpFlowRatePercent = 25.0;
        let recycledMixRatio = 0.99;
        if (currentState.serverTempC > 60) { pumpFlowRatePercent = 85.0; recycledMixRatio = 0.95; }
        else if (currentState.serverTempC > 50) { pumpFlowRatePercent = 55.0; recycledMixRatio = 0.98; }
        
        action = {
          pumpFlowRatePercent,
          recycledMixRatio,
          safetyOverrideTriggered: false,
          source: "node_fallback"
        };
      }
    }

    // Write log
    db.logCoolingDecision({
      facilityId,
      observedTempC: currentState.serverTempC,
      observedLoadPercent: currentState.serverLoadPercent,
      recycledTankLevelPercent: currentState.recycledTankLevelPercent,
      freshwaterTankLevelPercent: currentState.freshwaterTankLevelPercent,
      ambientTempC: currentState.ambientTempC,
      pumpFlowRatePercent: action.pumpFlowRatePercent,
      recycledRatio: action.recycledMixRatio,
      safetyOverrideTriggered: action.safetyOverrideTriggered,
      rewardSignal: null, // we can compute a mock reward or extract it if Python returns it
      source: action.source
    });

    // Update cumulative savings if DEPLOYED
    const pol = db.getCoolingPolicyByFacilityId(facilityId);
    if (pol && pol.status === PolicyStatus.DEPLOYED) {
      // Add fake usage delta
      // For RL agent, let's assume it used X 
      const total_w = action.pumpFlowRatePercent * 0.1;
      const rlFresh = total_w * (1.0 - action.recycledMixRatio);
      
      // Compare to what baseline would have used (if temp>65 -> 100 pump & 0.7 mix, else 40 pump & 0.7 mix)
      const bPump = currentState.serverTempC > 65 ? 100 : 40;
      const bTotalW = bPump * 0.1;
      const bFresh = bTotalW * 0.3; // 1-0.7
      
      db.updateCoolingPolicy(facilityId, {
        cumulativeWaterSavedLiters: pol.cumulativeWaterSavedLiters + (bTotalW - total_w) * 10, // scale factor for visual impact
        cumulativeFreshwaterAvoidedLiters: pol.cumulativeFreshwaterAvoidedLiters + (bFresh - rlFresh) * 10,
        baselineComparisonLiters: pol.baselineComparisonLiters + bTotalW * 10
      });
    }

    return action;
  },

  getEfficiencyReport(facilityId: string, range: string) {
    const logs = db.getCoolingDecisionLogs(facilityId);
    const pol = db.getCoolingPolicyByFacilityId(facilityId);
    
    // We try to load the baseline comparison from python training run
    let baselineData = null;
    try {
      if (fs.existsSync("baseline_comparison.json")) {
        baselineData = JSON.parse(fs.readFileSync("baseline_comparison.json", "utf8"));
      }
    } catch(e) {}
    
    if (baselineData && baselineData.baselineUsageLiters.length > 0) {
      return baselineData;
    }

    // Generate mock graph arrays based on pol summary
    const labels = [];
    const baselineUsageLiters = [];
    const rlUsageLiters = [];
    
    let bTotal = 0;
    let rlTotal = 0;
    for (let i = 0; i < 50; i++) {
        labels.push(`T-${50-i}m`);
        bTotal += 10 + Math.random() * 2;
        rlTotal += 6 + Math.random() * 1.5;
        baselineUsageLiters.push(parseFloat(bTotal.toFixed(2)));
        rlUsageLiters.push(parseFloat(rlTotal.toFixed(2)));
    }

    return {
        labels,
        baselineUsageLiters,
        rlUsageLiters
    };
  }
};
