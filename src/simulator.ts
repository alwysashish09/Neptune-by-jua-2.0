/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "./dbStore.js";
import { Role } from "./types.js";

type ListenerCallback = (event: string, data: any) => void;

class IoTTelemetrySimulator {
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Set<ListenerCallback> = new Set();

  public registerListener(callback: ListenerCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private broadcast(event: string, data: any) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (err) {
        console.error("Error sending telemetry event to listener:", err);
      }
    }
  }

  public start() {
    if (this.intervalId) return;

    console.log("🚀 Launching Neptune IoT Telemetry & Market Simulator (5s sweeps)");
    this.intervalId = setInterval(() => {
      this.sweepFacilities();
      this.sweepMarkets();
    }, 5000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private sweepFacilities() {
    const state = db.getState();
    const dcFacilities = state.facilities.filter(f => f.type === Role.DATA_CENTER);

    for (const facility of dcFacilities) {
      const profile = db.getThermalProfileByFacilityId(facility.id);
      if (!profile) continue;

      // Random walk Exit Temp (55°C - 75°C)
      let temp = profile.currentExitTempC ?? 65.0;
      const tDelta = (Math.random() - 0.5) * 1.0; // ±0.5°C
      temp = Math.min(Math.max(temp + tDelta, 55.0), 75.0);

      // Random walk Load Percent (40% - 95%)
      let load = profile.currentLoadPercent ?? 60.0;
      const lDelta = (Math.random() - 0.5) * 6.0; // ±3%
      load = Math.min(Math.max(load + lDelta, 40.0), 95.0);

      // Dynamically calculate available MWth based on load
      // Linear scale: at baseline 40% load, capacity = 5.0 MWth. At 95% load, capacity = 15.0 MWth
      const calcMWth = 5.0 + ((load - 40.0) / 55.0) * 10.0;
      const availableThermalOutputMWth = parseFloat(calcMWth.toFixed(2));

      // Update Database
      db.updateThermalProfile(facility.id, {
        currentExitTempC: parseFloat(temp.toFixed(2)),
        currentLoadPercent: parseFloat(load.toFixed(2)),
        availableThermalOutputMWth
      });

      // Broadcast update
      this.broadcast("thermal:update", {
        facilityId: facility.id,
        currentExitTempC: parseFloat(temp.toFixed(1)),
        currentLoadPercent: Math.round(load),
        availableThermalOutputMWth
      });

      // Simulate a small automatic heat delivery if there are active contracts
      this.triggerSimulatedThermalDelivery(facility.id, availableThermalOutputMWth);
    }
  }

  private sweepMarkets() {
    const state = db.getState();
    
    for (const market of state.markets) {
      // Walk price (slow randomized drift)
      const drift = (Math.random() - 0.48) * 0.15; // slow positive drift
      let price = market.pricePerGJ + drift;
      price = Math.max(price, 1.50); // don't go below floor of 1.50

      const deltaPercent = (drift / market.pricePerGJ) * 100;

      market.pricePerGJ = parseFloat(price.toFixed(2));
      market.deltaPercent = parseFloat(deltaPercent.toFixed(1));

      this.broadcast("ticker:update", {
        marketId: market.id,
        pricePerGJ: market.pricePerGJ,
        deltaPercent: market.deltaPercent
      });
    }

    db.save();
  }

  /**
   * Automatically adds rolling meter logs for active contracts to reflect simulation delivery progress.
   */
  private triggerSimulatedThermalDelivery(facilityId: string, currentMWth: number) {
    const state = db.getState();
    // Find active contracts for this source facility
    const matchedIds = state.matches
      .filter(m => m.sourceFacilityId === facilityId && m.status === "ACCEPTED")
      .map(m => m.id);

    const activeContracts = state.contracts.filter(
      c => matchedIds.includes(c.matchId) && c.status === "ACTIVE"
    );

    if (activeContracts.length === 0) return;

    // Delivery sweep: Add 5 seconds of physical thermal output split evenly among active contracts
    // 5 seconds output: currentMWth * 5 seconds * 0.001 (GJ factor) = GJ
    // 1 MW = 1.0 MJ/s. Over 5s, 1 MW yields 5.0 MJ = 0.005 GJ.
    const baseGj = currentMWth * 0.005;
    const shareGj = parseFloat((baseGj / activeContracts.length).toFixed(4));

    for (const contract of activeContracts) {
      const start = new Date(Date.now() - 5000).toISOString();
      const end = new Date().toISOString();
      const cashAmount = parseFloat((shareGj * contract.pricePerGJ).toFixed(2));

      // Log delivery
      db.createThermalDelivery(contract.id, shareGj, cashAmount, start, end);
    }
  }
}

export const simulator = new IoTTelemetrySimulator();
