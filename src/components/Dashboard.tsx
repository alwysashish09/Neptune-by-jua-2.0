/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Flame, ShieldAlert, CheckCircle2, TrendingUp, Cpu, 
  Activity, ArrowDownRight, RefreshCw, Layers, Award, FileSpreadsheet
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Facility, ComplianceRecord, ComplianceStatus } from "../types.js";

interface DashboardProps {
  token: string;
  facilities: Facility[];
  selectedFacility: Facility | null;
  onSelectFacility: (fac: Facility) => void;
  onNavigateToOnboarding: () => void;
  sseData: any; // Real-time feed
}

interface HistoricalData {
  time: string;
  temp: number;
  load: number;
}

export default function Dashboard({
  token,
  facilities,
  selectedFacility,
  onSelectFacility,
  onNavigateToOnboarding,
  sseData
}: DashboardProps) {
  const [loading, setLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceRecord | null>(null);
  const [chartData, setChartData] = useState<HistoricalData[]>([]);
  const [recentLogs, setRecentLogs] = useState<{ id: string; time: string; msg: string; type: "info" | "warn" | "success" }[]>([]);

  // Find your Data Centers first to display
  const dcFacilities = facilities.filter(f => f.type === "DATA_CENTER");

  useEffect(() => {
    if (dcFacilities.length > 0 && !selectedFacility) {
      onSelectFacility(dcFacilities[0]);
    }
  }, [facilities, selectedFacility]);

  // Fetch Compliance parameters
  const fetchCompliance = async () => {
    if (!selectedFacility) return;
    try {
      const res = await fetch(`/api/v1/facilities/${selectedFacility.id}/compliance`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompliance(data);
      }
    } catch (e) {
      console.error("Could not fetch compliance log", e);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, [selectedFacility]);

  // Recalculate Compliance
  const handleRecalculate = async () => {
    if (!selectedFacility) return;
    setRecalcLoading(true);
    try {
      const res = await fetch(`/api/v1/compliance/recalculate/${selectedFacility.id}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompliance(data);
        addLog("System trigger: Recalculated ERF compliance matrix on-demand", "success");
      }
    } catch (e) {
      console.error("On-demand compliance computation failed", e);
      addLog("System trigger error: Recalculation computation timeout", "warn");
    } finally {
      setRecalcLoading(false);
    }
  };

  // Helper log addition
  const addLog = (msg: string, type: "info" | "warn" | "success" = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setRecentLogs(prev => [
      { id: Date.now().toString(), time: timeStr, msg, type },
      ...prev.slice(0, 15)
    ]);
  };

  // Bootstrap initial chart records
  useEffect(() => {
    if (!selectedFacility) return;
    const profile = selectedFacility.thermalProfile;
    const initialTemp = profile?.currentExitTempC ?? 65.0;
    const initialLoad = profile?.currentLoadPercent ?? 60.0;

    const baseData: HistoricalData[] = [];
    const now = new Date();
    for (let i = 10; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 5000);
      baseData.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        temp: parseFloat((initialTemp + Math.sin(i) * 1.5).toFixed(1)),
        load: Math.round(initialLoad + Math.cos(i) * 4)
      });
    }
    setChartData(baseData);
    addLog(`System trace: Telemetry connected to ${selectedFacility.name}`, "info");
  }, [selectedFacility]);

  // Bind to SSE (Real-Time) event shifts
  useEffect(() => {
    if (!sseData || !selectedFacility) return;

    if (sseData.event === "thermal:update" && sseData.data.facilityId === selectedFacility.id) {
       const payload = sseData.data;

       // Shift Recharts records
       setChartData(prev => {
         const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
         const updated = [
           ...prev,
           {
             time: nextTime,
             temp: payload.currentExitTempC,
             load: payload.currentLoadPercent
           }
         ];
         return updated.slice(-15); // keep 15 windows
       });

       // Log tick
       addLog(`IoT Node [${selectedFacility.name.substring(0,10)}...] exit exhaust logged at ${payload.currentExitTempC}°C, grid load ${payload.currentLoadPercent}%`, "info");
    }

    if (sseData.event === "ticker:update") {
       // Also log market price changes occasionally
       if (Math.random() > 0.75) {
         addLog(`Global Heat Ledger: ${sseData.data.marketId.toUpperCase()} updated trading rate to €${sseData.data.pricePerGJ}/GJ`, "success");
       }
    }
  }, [sseData, selectedFacility]);

  // Styling helper
  const getComplianceBadge = (status: ComplianceStatus | undefined) => {
    if (!status) return { text: "Unassigned", cls: "text-gray-400 border-gray-400 bg-gray-400/5", icon: Cpu };
    switch (status) {
      case "COMPLIANT":
        return { text: "Compliant", cls: "text-[#22C55E] border-[#22C55E]/40 bg-[#22C55E]/5", icon: CheckCircle2 };
      case "AT_RISK":
        return { text: "At-Risk", cls: "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/5", icon: ShieldAlert };
      case "VIOLATION":
        return { text: "Violation", cls: "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/5", icon: ShieldAlert };
    }
  };

  const badge = getComplianceBadge(compliance?.status);
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6 font-sans">
      {/* Node Switcher banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131822] border border-[#1F2733] p-4 rounded-xl">
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]">Selected Thermal Grid Producer</div>
          <div className="flex items-center gap-3">
            <select
              value={selectedFacility?.id || ""}
              onChange={(e) => {
                const found = facilities.find(f => f.id === e.target.value);
                if (found) onSelectFacility(found);
              }}
              className="bg-[#0A0E14] border border-[#1F2733] text-white rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-[#FF6B35] transition"
            >
              {dcFacilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
              {dcFacilities.length === 0 && (
                <option value="">No Active Emitters</option>
              )}
            </select>
            <button
              onClick={onNavigateToOnboarding}
              className="text-xs text-[#FF6B35] hover:underline font-mono"
            >
              + Register Node
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-green-400 bg-green-400/10 border border-green-500/20 rounded-full px-2.5 py-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            SIMULATING
          </span>
          <button
            onClick={handleRecalculate}
            disabled={recalcLoading || !selectedFacility}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1F2733] hover:bg-[#253042] text-[#94A3B8] hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalcLoading ? "animate-spin" : ""}`} />
            Recalc ERF
          </button>
        </div>
      </div>

      {selectedFacility ? (
        <>
          {/* Key Metric Cards - Upgraded for Bold Typography Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* COMPLIANCE STATUS CARD */}
            <div className="bg-[#131822] border border-[#1F2733] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Legal Compliance</span>
                <span className={`text-4xl font-black font-mono tracking-tighter block uppercase ${badge.cls.split(" ")[0]}`}>
                  {badge.text}
                </span>
                <div className="text-[10px] text-gray-400 mt-2 uppercase font-mono">Limit: 20.0% ERF</div>
              </div>
              <div className="text-[10px] text-[#94A3B8] font-mono mt-2 pt-2 border-t border-[#1F2733]/50 flex justify-between">
                <span>DAYS TO AUDIT:</span>
                <strong className="text-[#EF4444] font-bold">{compliance?.daysToDeadline || 194}</strong>
              </div>
            </div>

            {/* LIVE ENERGY REUSE FACTOR (ERF) */}
            <div className="bg-[#131822] border border-[#1F2733] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Energy Reuse (ERF)</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white font-mono tracking-tighter">
                    {compliance ? (compliance.currentERF * 100).toFixed(1) : "0.0"}
                    <span className="text-lg font-bold text-[#FF6B35]">%</span>
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 uppercase font-mono">Rolling 30-day index</div>
              </div>
              <div className="text-[10px] text-[#22C55E] font-mono mt-2 pt-2 border-t border-[#1F2733]/50 flex justify-between items-center">
                <span>RECOVERY PRESSURE:</span>
                <span className="flex items-center gap-0.5 font-bold">
                  <TrendingUp className="w-3 h-3" /> +2.3%
                </span>
              </div>
            </div>

            {/* LIVE EXHAUST EXIT TEMP */}
            <div className="bg-[#131822] border border-[#1F2733] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Exit Exhaust Temp</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#FF6B35] font-mono tracking-tighter">
                    {selectedFacility.thermalProfile?.currentExitTempC || 60.0}
                    <span className="text-lg font-bold">°C</span>
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 uppercase font-mono">Continuous IoT Feed</div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-[#1F2733]/50 flex justify-between">
                <span>VARIANCE ENVELOPE:</span>
                <span className="font-mono text-[#FF6B35]">55°C - 75°C</span>
              </div>
            </div>

            {/* CURRENT AVAILABLE MASS FLOW */}
            <div className="bg-[#131822] border border-[#1F2733] p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Simulated Load Capacity</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#4FC3F7] font-mono tracking-tighter">
                    {selectedFacility.thermalProfile?.currentLoadPercent || 50}
                    <span className="text-lg font-bold">%</span>
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 uppercase font-mono">
                  Capacity: {selectedFacility.thermalProfile?.availableThermalOutputMWth || 8.0} MWth
                </div>
              </div>
              <div className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-[#1F2733]/50 flex justify-between">
                <span>DYNAMIC THERMAL OUT:</span>
                <span className="font-mono text-white">5.0 - 15.0 MWth</span>
              </div>
            </div>

          </div>

          {/* Core Telemetry and Live Dual-Axis Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Real-time Recharts Chart */}
            <div className="lg:col-span-8 bg-[#131822] border border-[#1F2733] p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#1F2733]">
                <div>
                  <h2 className="text-base font-black tracking-tighter text-white uppercase">THERMAL GRID DEVIATION TRACKER</h2>
                  <p className="text-[10px] text-gray-500 font-mono tracking-widest mt-1 uppercase">Continuous telemetry tracking of core cooling indicators</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#FF6B35]/20 border border-[#FF6B35] rounded-sm" />
                    <span className="text-[#94A3B8]">Temp (°C)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#4FC3F7]/20 border border-[#4FC3F7] rounded-sm" />
                    <span className="text-[#94A3B8]">Load (%)</span>
                  </div>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2733" />
                    <XAxis dataKey="time" stroke="#4A5D78" fontSize={9} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#FF6B35" fontSize={9} domain={[50, 80]} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#4FC3F7" fontSize={9} domain={[30, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#131822", borderColor: "#1F2733", borderRadius: "8px" }}
                      labelStyle={{ color: "#94A3B8", fontFamily: "monospace", fontSize: "10px" }}
                      itemStyle={{ fontSize: "11px" }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#FF6B35" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Exhaust Temp (°C)" />
                    <Area yAxisId="right" type="monotone" dataKey="load" stroke="#4FC3F7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLoad)" name="Compute Grid Load (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* IoT Telemetry ticker logs */}
            <div className="lg:col-span-4 bg-[#131822] border border-[#1F2733] p-5 rounded-xl flex flex-col space-y-4 max-h-[385px] overflow-hidden">
              <h3 className="text-xs font-black font-mono tracking-widest text-[#FF6B35] uppercase border-b border-[#1F2733] pb-3 flex items-center justify-between">
                <span>MICRO TELEMETRY LOGGER</span>
                <Activity className="w-4 h-4 text-[#FF6B35] animate-pulse" />
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-2 border border-[#1F2733] bg-[#0A0E14] rounded-lg text-[10px] font-mono flex items-start gap-2 leading-relaxed">
                    <span className="text-[#64748B] shrink-0 mt-0.5">{log.time}</span>
                    <div className="flex-1">
                      <span className={log.type === "success" ? "text-green-400" : log.type === "warn" ? "text-amber-400" : "text-gray-300"}>
                        {log.msg}
                      </span>
                    </div>
                  </div>
                ))}
                
                {recentLogs.length === 0 && (
                  <div className="h-full flex items-center justify-center text-xs text-[#64748B] italic py-10 font-mono">
                    Awaiting telemetry push...
                  </div>
                )}
              </div>
            </div>

          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-[#131822] border border-[#1F2733] rounded-xl text-center min-h-[350px]">
          <layers className="w-12 h-12 text-[#94A3B8] mb-4 animate-bounce" />
          <h3 className="text-lg font-semibold mb-2">No Active Facilities Registered</h3>
          <p className="text-[#94A3B8] text-sm max-w-md mb-6">
            Register your high-density Data Center or buyer energy network to activate the live Thermal Twin simulator and compliance matrix.
          </p>
          <button
            onClick={onNavigateToOnboarding}
            className="px-5 py-2.5 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black font-semibold shadow-lg shadow-[#FF6B35]/25 transition"
          >
            Launch Wizard Onboarding
          </button>
        </div>
      )}
    </div>
  );
}
