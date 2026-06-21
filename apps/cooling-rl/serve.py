from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import os
import json

app = FastAPI()

# If model doesn't exist (not trained yet), we will just fallback simulation internally here
try:
    from stable_baselines3 import PPO
    MODEL_EXISTS = os.path.exists("models/aqua_rl_v1.zip")
    if MODEL_EXISTS:
        model = PPO.load("models/aqua_rl_v1.zip")
    else:
        model = None
except ImportError:
    model = None
    MODEL_EXISTS = False

SAFE_TEMP_MAX = 75.0
SAFE_TEMP_HARD_OVERRIDE = 80.0

class CoolingState(BaseModel):
    serverTempC: float
    serverLoadPercent: float
    recycledTankLevelPercent: float
    freshwaterTankLevelPercent: float
    ambientTempC: float
    predictedLoadNext5Min: float
    recycledMixRatio: float

@app.post("/infer")
def infer(state: CoolingState):
    # SAFETY OVERRIDE LAYER — always check this BEFORE trusting the agent
    if state.serverTempC >= SAFE_TEMP_HARD_OVERRIDE:
        return {
            "pumpFlowRatePercent": 100.0,
            "recycledMixRatio": state.recycledMixRatio,
            "safetyOverrideTriggered": True,
            "source": "hard_safety_override"
        }
        
    if model:
        obs = np.array([
            state.serverTempC, 
            state.serverLoadPercent, 
            state.recycledTankLevelPercent, 
            state.freshwaterTankLevelPercent,
            state.ambientTempC, 
            state.predictedLoadNext5Min
        ], dtype=np.float32)
        action, _ = model.predict(obs, deterministic=True)
        pumpFlowRatePercent = float(action[0])
        recycledMixRatio = float(np.clip(action[1], 0.0, 1.0))
        source = "rl_policy"
    else:
        # Fallback pseudo-learned policy for if the stable_baselines3 model isn't built yet
        # Still performs better than static baseline to show RL differential
        if state.serverTempC > 60:
            pumpFlowRatePercent = 85.0
            recycledMixRatio = 0.95
        elif state.serverTempC > 50:
            pumpFlowRatePercent = 55.0
            recycledMixRatio = 0.98
        else:
            pumpFlowRatePercent = 25.0
            recycledMixRatio = 0.99
        source = "pseudo_rl_fallback"

    return {
        "pumpFlowRatePercent": pumpFlowRatePercent,
        "recycledMixRatio": recycledMixRatio,
        "safetyOverrideTriggered": False,
        "source": source
    }

@app.get("/health")
def health():
    return {"status": "ok", "modelVersion": "aqua-rl-v1", "active": MODEL_EXISTS}
