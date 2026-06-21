import os
import gymnasium as gym
from gymnasium import spaces
import numpy as np
import json
from stable_baselines3 import PPO

# Constants
SAFE_TEMP_MAX = 75.0
ALPHA = 1.0
BETA = 4.0
GAMMA = 50.0
DELTA = 0.1
EPSILON = 0.5

class CapsuleCoolingEnv(gym.Env):
    def __init__(self):
        super(CapsuleCoolingEnv, self).__init__()
        # Obs: [serverTempC, serverLoadPercent, recycledTankLevel, freshwaterTankLevel, ambientTempC, predictedLoad]
        # Actions: [pumpFlowRatePercent (0-100), recycledMixRatio (0-1)]
        low_obs = np.array([20.0, 0.0, 0.0, 0.0, -10.0, 0.0])
        high_obs = np.array([120.0, 100.0, 100.0, 100.0, 50.0, 100.0])
        self.observation_space = spaces.Box(low=low_obs, high=high_obs, dtype=np.float32)
        
        self.action_space = spaces.Box(low=np.array([0.0, 0.0]), high=np.array([100.0, 1.0]), dtype=np.float32)
        
        self.state = None
        self.prev_action = np.array([0.0, 0.0])
        self.step_count = 0
        self.max_steps = 500

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        # Random initial state
        serverTempC = np.random.uniform(40.0, 60.0)
        serverLoadPercent = np.random.uniform(30.0, 80.0)
        recycledTank = np.random.uniform(50.0, 100.0)
        freshwaterTank = np.random.uniform(50.0, 100.0)
        ambientTempC = np.random.uniform(15.0, 35.0)
        predictedLoad = np.random.uniform(30.0, 80.0)
        
        self.state = np.array([serverTempC, serverLoadPercent, recycledTank, freshwaterTank, ambientTempC, predictedLoad], dtype=np.float32)
        self.prev_action = np.array([50.0, 0.5])
        self.step_count = 0
        return self.state, {}

    def step(self, action):
        self.step_count += 1
        pumpFlowPercent, recycledMixRatio = action
        
        serverTempC, serverLoadPercent, recycledTank, freshwaterTank, ambientTemp, predictedLoad = self.state
        
        # Thermal Dynamics Simulation
        k_load = 0.05
        k_cool = 0.02
        k_ambient = 0.01

        cooling_efficiency = 1.0 - (recycledMixRatio * 0.1)  # recycled water slightly less cool
        temp_delta = (k_load * serverLoadPercent) \
                    - (k_cool * pumpFlowPercent * cooling_efficiency) \
                    - (k_ambient * (serverTempC - ambientTemp))
        
        new_serverTempC = max(20.0, serverTempC + temp_delta)
        
        # Water usage simulation
        total_water_used = pumpFlowPercent * 0.1
        recycled_used = total_water_used * recycledMixRatio
        fresh_used = total_water_used * (1.0 - recycledMixRatio)
        
        new_recycledTank = max(0.0, recycledTank - recycled_used + 0.5) # +0.5 base recharge
        new_freshwaterTank = max(0.0, freshwaterTank - fresh_used)
        
        # Reward function
        reward = -(ALPHA * total_water_used)
        reward -= (BETA * fresh_used)
        overshoot = max(0.0, new_serverTempC - SAFE_TEMP_MAX)
        reward -= (GAMMA * (overshoot ** 2))
        reward -= (DELTA * pumpFlowPercent)
        action_diff = np.linalg.norm(action - self.prev_action)
        reward -= (EPSILON * action_diff)
        
        new_load = max(0, min(100, serverLoadPercent + np.random.normal(0, 5)))
        new_predicted = max(0, min(100, new_load + np.random.normal(0, 10)))
        
        self.state = np.array([new_serverTempC, new_load, new_recycledTank, new_freshwaterTank, ambientTemp, new_predicted], dtype=np.float32)
        self.prev_action = action
        
        terminated = False
        truncated = self.step_count >= self.max_steps
        
        return self.state, float(reward), terminated, truncated, {
            "total_water": total_water_used,
            "fresh_water": fresh_used,
            "overshoot": overshoot > 0
        }

def train_and_evaluate():
    models_dir = "models"
    os.makedirs(models_dir, exist_ok=True)
    
    env = CapsuleCoolingEnv()
    print("Training RL agent...")
    model = PPO("MlpPolicy", env, verbose=1)
    # Use shorter timesteps for fast generation if run manually
    model.learn(total_timesteps=10000) 
    model.save(f"{models_dir}/aqua_rl_v1")
    
    # Evaluate Baseline vs RL
    env_eval = CapsuleCoolingEnv()
    baseline_usage = []
    rl_usage = []
    
    obs, _ = env_eval.reset(seed=42)
    obs_baseline = np.copy(obs)
    
    baseline_cumulative = 0.0
    rl_cumulative = 0.0
    
    for step in range(500):
        # Baseline static policy
        srv_temp = obs_baseline[0]
        if srv_temp > 65.0:
            pump = 100.0
        else:
            pump = 40.0
        rec_ratio = 0.7
        
        # Apply baseline
        # (Replicating step logic for baseline separately to track)
        total_w_b = pump * 0.1
        baseline_cumulative += total_w_b
        baseline_usage.append(baseline_cumulative)
        
        # Simple dynamics advance for baseline (approx)
        k_load, k_cool, k_amb = 0.05, 0.02, 0.01
        eff = 1.0 - (rec_ratio * 0.1)
        td = (k_load * obs_baseline[1]) - (k_cool * pump * eff) - (k_amb * (obs_baseline[0] - obs_baseline[4]))
        obs_baseline[0] = max(20.0, obs_baseline[0] + td)
        obs_baseline[1] = max(0, min(100, obs_baseline[1] + np.random.normal(0, 5)))
        

        # Apply RL
        action, _ = model.predict(obs, deterministic=True)
        obs, reward, term, trunc, info = env_eval.step(action)
        rl_cumulative += info["total_water"]
        rl_usage.append(rl_cumulative)

    comparison = {
        "labels": [f"Step {i}" for i in range(500)],
        "baselineUsageLiters": baseline_usage,
        "rlUsageLiters": rl_usage,
        "totalSaved": baseline_cumulative - rl_cumulative
    }
    with open("baseline_comparison.json", "w") as f:
        json.dump(comparison, f)

if __name__ == "__main__":
    train_and_evaluate()
