/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Flame, Compass, CheckCircle, ArrowRight, ShieldAlert, Cpu, HeartHandshake, Database } from "lucide-react";
import { Role } from "../types.js";

interface OnboardingProps {
  token: string;
  onOnboardingComplete: (newFacility: any) => void;
  onBackToDashboard: () => void;
}

export default function Onboarding({ token, onOnboardingComplete, onBackToDashboard }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [facilityType, setFacilityType] = useState<Role>(Role.DATA_CENTER);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("23.25");
  const [longitude, setLongitude] = useState("77.41");
  const [coolingSystemType, setCoolingSystemType] = useState("Direct Liquid Immersion Chassis");
  
  // Thermodynamic requirements
  const [currentExitTempC, setCurrentExitTempC] = useState("65");
  const [availableThermalOutputMWth, setAvailableThermalOutputMWth] = useState("10");
  const [requiredTempC, setRequiredTempC] = useState("45");
  const [requiredVolumeGJ, setRequiredVolumeGJ] = useState("5000");

  // Read draft state if pre-minted
  React.useEffect(() => {
    try {
      const draftStr = localStorage.getItem("neptune_pre_minted_draft");
      if (draftStr) {
        const d = JSON.parse(draftStr);
        if (d.name) setName(d.name);
        if (d.type) setFacilityType(d.type as Role);
        if (d.latitude !== undefined) setLatitude(d.latitude.toString());
        if (d.longitude !== undefined) setLongitude(d.longitude.toString());
      }
    } catch (e) {
      console.warn("Failed parsing pre-minted draft", e);
    }
  }, []);

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError("Facility registry name is required");
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        setError("Latitude must be a valid number between -90 and 90");
        return;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        setError("Longitude must be a valid number between -180 and 180");
        return;
      }
      setError(null);
      setStep(3);
    }
  };

  const handleCreateFacility = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create Facility (the backend create/update logic handles linking or updating the draft to full facility)
      const response = await fetch("/api/v1/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type: facilityType,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          coolingSystemType: facilityType === Role.DATA_CENTER ? coolingSystemType : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to commit facility to directory");
      }

      // Set Thermal Profile Values
      const profileUpdates: any = facilityType === Role.DATA_CENTER ? {
        currentExitTempC: parseFloat(currentExitTempC),
        currentLoadPercent: 60,
        availableThermalOutputMWth: parseFloat(availableThermalOutputMWth)
      } : {
        requiredTempC: parseFloat(requiredTempC),
        requiredVolumeGJ: parseFloat(requiredVolumeGJ)
      };

      const profileResponse = await fetch(`/api/v1/facilities/${data.id}/thermal-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileUpdates)
      });

      if (!profileResponse.ok) {
        const pError = await profileResponse.json();
        throw new Error(pError.error?.message || "Failed to provision thermal profile criteria");
      }

      // On onboarding complete, clear the temporary localStorage draft
      localStorage.removeItem("neptune_pre_minted_draft");

      // Complete
      onOnboardingComplete(data);
    } catch (err: any) {
      setError(err.message || "Onboarding failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative selection:bg-[#FF6B35] selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-[#0A0E14]_60% to-[#0A0E14] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#4FC3F7] p-[1px]">
            <div className="w-full h-full rounded-[11px] bg-[#0A0E14] flex items-center justify-center">
              <Compass className="w-6 h-6 text-[#FF6B35]" />
            </div>
          </div>
        </div>
        <h2 className="text-center text-3xl font-medium tracking-tight">Onboarding Wizard</h2>
        <p className="mt-2 text-center text-sm text-[#94A3B8]">
          Register node coordinates, upload IoT profile specifications, and compute thermal links
        </p>

        {/* 3-Step Wizard Progress Nav */}
        <div className="mt-8 flex justify-center items-center gap-2 max-w-sm mx-auto">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step === s ? "bg-[#FF6B35] text-black" : step > s ? "bg-green-500/20 text-green-500 border border-green-500" : "bg-[#131822] text-[#64748B] border border-[#1F2733]"}`}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className={`h-[1px] w-12 ${step > s ? "bg-green-500" : "bg-[#1F2733]"}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#131822] py-8 px-4 border border-[#1F2733] shadow-xl rounded-2xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200 font-medium">{error}</div>
            </div>
          )}

          {/* STEP 1: SELECT FACILITY CLASSIFICATION & NOMENCLATURE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-3">Facility Classification</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DATA CENTER */}
                  <div 
                    onClick={() => setFacilityType(Role.DATA_CENTER)}
                    className={`cursor-pointer group relative p-5 rounded-xl border-2 transition ${facilityType === Role.DATA_CENTER ? "border-[#FF6B35] bg-[#FF6B35]/5" : "border-[#1F2733] bg-[#0A0E14] hover:border-[#1F2733]/80"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Cpu className={`w-5 h-5 ${facilityType === Role.DATA_CENTER ? "text-[#FF6B35]" : "text-[#94A3B8]"}`} />
                      <span className="font-semibold text-white">Heat Producer</span>
                    </div>
                    <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
                      E.g. High-density servers, grid computing racks, utility boilers. Penalized under Energy Reuse regulations.
                    </p>
                  </div>

                  {/* HEAT BUYER */}
                  <div 
                    onClick={() => setFacilityType(Role.HEAT_BUYER)}
                    className={`cursor-pointer group relative p-5 rounded-xl border-2 transition ${facilityType === Role.HEAT_BUYER ? "border-[#4FC3F7] bg-[#4FC3F7]/5" : "border-[#1F2733] bg-[#0A0E14] hover:border-[#1F2733]/80"}`}
                  >
                    <div className="flex items-center gap-3">
                      <HeartHandshake className={`w-5 h-5 ${facilityType === Role.HEAT_BUYER ? "text-[#4FC3F7]" : "text-[#94A3B8]"}`} />
                      <span className="font-semibold text-white">Heat Buyer</span>
                    </div>
                    <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">
                      E.g. District grids, textile operations, greenhouses, or water facilities matching temperature guidelines.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Facility Registry Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bhopal Edge Core Hub Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm"
                />
              </div>

              {facilityType === Role.DATA_CENTER && (
                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Cooling Architecture</label>
                  <select
                    value={coolingSystemType}
                    onChange={(e) => setCoolingSystemType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm"
                  >
                    <option value="Direct Liquid Immersion Chassis">Direct Liquid Immersion Chassis</option>
                    <option value="Cold Plate Heat Exchanger Network">Cold Plate Heat Exchanger Network</option>
                    <option value="Liquid-to-Air Exhaust Plenum">Liquid-to-Air Exhaust Plenum</option>
                    <option value="Evaporative Closed-Loop Matrix">Evaporative Closed-Loop Matrix</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-between gap-4">
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-5 py-2.5 rounded-lg border border-[#1F2733] bg-[#131822] text-[#94A3B8] hover:text-white transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black transition text-sm font-semibold flex items-center gap-1"
                >
                  Configure Telemetry
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: METRIC INTAKE & GEOLOCATION COORDINATES */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-[#4FC3F7] mb-2 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Database className="w-4 h-4" /> Spatial GIS Node Positioning
                </h3>
                <p className="text-xs text-[#94A3B8] mb-4">
                  Please program coordinates to enable thermodynamic matching mapping around the Bhopal hub (Lat: 23.25, Lng: 77.41)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#FF6B35] mb-2 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <Flame className="w-4 h-4" /> Thermal Profile Constants
                </h3>
                
                {facilityType === Role.DATA_CENTER ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Exhaust Exit Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={currentExitTempC}
                        onChange={(e) => setCurrentExitTempC(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Peak Capacity (MWth)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={availableThermalOutputMWth}
                        onChange={(e) => setAvailableThermalOutputMWth(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Required Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={requiredTempC}
                        onChange={(e) => setRequiredTempC(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-2">Target Volume (GJ/mo)</label>
                      <input
                        type="number"
                        required
                        value={requiredVolumeGJ}
                        onChange={(e) => setRequiredVolumeGJ(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-lg border border-[#1F2733] bg-[#131822] text-[#94A3B8] hover:text-white transition text-sm font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black transition text-sm font-semibold flex items-center gap-1"
                >
                  Thermodynamic Preview
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: THERMODYNAMIC ALIGNMENT PREVIEW */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#1F2733] bg-[#0A0E14] p-5 space-y-4">
                <h4 className="text-sm font-bold border-b border-[#1F2733] pb-2 font-mono tracking-widest uppercase text-white">Facility Alignment Summary</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94A3B8]">Node Name:</span>
                    <span className="font-semibold text-white">{name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94A3B8]">Classification:</span>
                    <span className={`font-semibold uppercase tracking-wider ${facilityType === Role.DATA_CENTER ? "text-[#FF6B35]" : "text-[#4FC3F7]"}`}>
                      {facilityType === Role.DATA_CENTER ? "Heat Producer Grid" : "Heat Sink Grid"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94A3B8]">GIS Position:</span>
                    <span className="font-mono text-white">{latitude}, {longitude}</span>
                  </div>

                  {facilityType === Role.DATA_CENTER ? (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Cooling Stack:</span>
                        <span className="text-white font-medium">{coolingSystemType}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Exhaust Temp Target:</span>
                        <span className="font-mono text-[#FF6B35] font-semibold">{currentExitTempC}°C</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Maximum available energy:</span>
                        <span className="font-mono text-white font-semibold">
                          {(parseFloat(availableThermalOutputMWth) * 2592).toLocaleString()} GJ / 30-day capacity
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Exhaust requirement temperature:</span>
                        <span className="font-mono text-[#4FC3F7] font-semibold">{requiredTempC}°C</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#94A3B8]">Buying capacity volume:</span>
                        <span className="font-mono text-white font-semibold">{parseFloat(requiredVolumeGJ).toLocaleString()} GJ / Month</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {facilityType === Role.DATA_CENTER && (
                <div className="p-4 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#94A3B8] leading-relaxed">
                    <strong className="text-white block mb-0.5">Automated Compliance Recalculation Ready</strong>
                    Once initialized, Neptune will launch automated rolling 30-day Energy Reuse calculations. Connect matches to move from <span className="text-red-400 font-semibold font-mono">VIOLATION</span> status to safe <span className="text-green-500 font-semibold font-mono">COMPLIANT</span> limits.
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between gap-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg border border-[#1F2733] bg-[#131822] text-[#94A3B8] hover:text-white transition text-sm font-medium disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCreateFacility}
                  className="px-6 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black font-semibold flex items-center justify-center gap-1 shadow-lg shadow-[#FF6B35]/20 text-sm disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Activate Facility Link"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
