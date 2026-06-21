import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Zap, Play, Pause, AlertTriangle } from "lucide-react";

export default function AquaRlPanel({ facilityId, token, sseData }: { facilityId: string, token: string, sseData: any }) {
  const [status, setStatus] = useState<"SIMULATING" | "TRAINING" | "DEPLOYED" | "PAUSED">("SIMULATING");
  const [reportData, setReportData] = useState<any[]>([]);
  const [liveReadouts, setLiveReadouts] = useState({ pumpFlow: "0", recycledRatio: "0", freshSaved: "0", overrideMsg: "" });
  
  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/cooling-policy/efficiency-report?range=7d`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.labels) {
          const formatted = data.labels.map((L: string, i: number) => ({
            name: L,
            Baseline: data.baselineUsageLiters[i],
            RL_Optimized: data.rlUsageLiters[i]
          }));
          setReportData(formatted);
        }
      }
    } catch(e) {}
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/cooling-policy/status`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        setLiveReadouts(prev => ({
           ...prev,
           freshSaved: data.cumulativeFreshwaterAvoidedLiters?.toFixed(1) || "0.0"
        }));
      }
    } catch(e) {}
  };
  
  useEffect(() => {
     fetchStatus();
     fetchReport();
  }, [facilityId]);

  useEffect(() => {
    if (!sseData || !sseData.event) return;
    if (sseData.event === "cooling:decision" && sseData.data.facilityId === facilityId) {
       setLiveReadouts(prev => ({
           ...prev,
           pumpFlow: sseData.data.pumpFlowRatePercent.toFixed(1),
           recycledRatio: (sseData.data.recycledMixRatio * 100).toFixed(0)
       }));
    } else if (sseData.event === "cooling:safety-override" && sseData.data.facilityId === facilityId) {
        setLiveReadouts(prev => ({
            ...prev,
            overrideMsg: `⚠️ Safety override triggered at ${new Date(sseData.data.timestamp).toLocaleTimeString()} — temp exceeded normal bounds, hard limit engaged.`
        }));
        setTimeout(() => setLiveReadouts(prev => ({ ...prev, overrideMsg: "" })), 10000);
    }
  }, [sseData, facilityId]);

  const toggleStatus = async () => {
    const newStatus = status === "DEPLOYED" ? "PAUSED" : "DEPLOYED";
    setStatus(newStatus);
    await fetch(`/api/v1/facilities/${facilityId}/cooling-policy/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
  };

  return (
    <div className="bg-[#131822] border border-[#1F2733] rounded-xl overflow-hidden mt-6 flex flex-col">
      <div className="p-4 border-b border-[#1F2733]/50 flex justify-between items-center bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-[#4FC3F7]" />
          <h3 className="font-bold text-white uppercase tracking-wider text-sm">Aqua-RL Cooling Controller</h3>
          <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border flex items-center gap-1.5
            ${status === "DEPLOYED" ? "bg-green-500/10 text-green-500 border-green-500/30" : 
              status === "SIMULATING" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-gray-500/10 text-gray-400 border-gray-500/30"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status === "DEPLOYED" ? "bg-green-500 animate-pulse" : status === "SIMULATING" ? "bg-amber-500" : "bg-gray-400"}`}></span>
            {status}
          </div>
        </div>
        <button onClick={toggleStatus} className="text-xs font-mono px-3 py-1.5 rounded bg-[#1F2733] hover:bg-[#2A3644] text-[#94A3B8] transition-colors flex items-center gap-2">
          {status === "DEPLOYED" ? <><Pause className="w-3 h-3" /> Pause RL Control</> : <><Play className="w-3 h-3" /> Engage RL Control</>}
        </button>
      </div>
      
      {liveReadouts.overrideMsg && (
        <div className="px-4 py-2 bg-red-500/10 border-y border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2">
           <AlertTriangle className="w-4 h-4" />
           {liveReadouts.overrideMsg}
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-[#1F2733]/50 border-b border-[#1F2733]/50">
        <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Recycled Ratio</span>
            <span className="text-3xl font-black font-mono text-[#4FC3F7]">{status === "DEPLOYED" ? liveReadouts.recycledRatio : "--"}%</span>
        </div>
        <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Pump Flow</span>
            <span className="text-3xl font-black font-mono text-white">{status === "DEPLOYED" ? liveReadouts.pumpFlow : "--"}%</span>
        </div>
        <div className="p-4 flex flex-col items-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Freshwater Avoided Today</span>
            <span className="text-3xl font-black font-mono text-[#22C55E]">{liveReadouts.freshSaved} L</span>
        </div>
      </div>

      <div className="p-4 h-[250px] w-full">
         <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={reportData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4FC3F7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4FC3F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2733" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickMargin={10} />
              <YAxis stroke="#64748B" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: "#131822", borderColor: "#1F2733", borderRadius: "8px", color: "white" }}
                itemStyle={{ fontSize: "12px", fontFamily: "monospace" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area type="monotone" dataKey="Baseline" stroke="#94A3B8" strokeDasharray="5 5" fill="none" strokeWidth={2} name="Static Baseline (L)" />
              <Area type="monotone" dataKey="RL_Optimized" stroke="#4FC3F7" fillOpacity={1} fill="url(#colorRL)" strokeWidth={2} name="RL Optimized (L)" />
            </AreaChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}
