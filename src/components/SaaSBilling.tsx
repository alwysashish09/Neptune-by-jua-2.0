/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, 
  RefreshCw, Award, Landmark, HelpCircle, History, Sparkles, AlertCircle
} from "lucide-react";
import { Organization, OrgPlan } from "../types.js";

interface BillingProps {
  token: string;
  activeOrg: Organization;
  onPlanUpgraded: () => void;
}

interface BillingItem {
  id: string;
  amount: number;
  purpose: string;
  plan: string;
  paymentId: string;
  date: string;
  status: string;
}

// Custom simulated Razorpay checkout form
interface SimulatedGatewayProps {
  amount: number;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

function SimulatedRazorpayGateway({ amount, onSuccess, onCancel }: SimulatedGatewayProps) {
  const [step, setStep] = useState<"method" | "card" | "otp" | "loading">("method");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loading");
    setTimeout(() => {
      const generatedPayId = `pay_sim_${Math.random().toString(36).substring(2, 10)}`;
      onSuccess(generatedPayId);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-sans text-gray-200">
      <div className="w-full max-w-sm bg-[#131722] border-2 border-[#FF6B35]/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Gateway Header */}
        <div className="bg-[#1C2030] p-4 border-b border-[#252E43] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-[#FF6B35] uppercase bg-[#FF6B35]/15 border border-[#FF6B35]/30 px-2 py-0.5 rounded">
              RAZORPAY Sandbox
            </span>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition text-xs font-mono">
            [Cancel]
          </button>
        </div>

        {/* Amount bar */}
        <div className="p-4 bg-[#181D2D] text-center border-b border-[#252E43]">
          <span className="text-[10px] font-mono uppercase text-gray-400">Transaction Amount</span>
          <div className="text-2xl font-black text-white font-mono mt-0.5">₹{amount.toLocaleString("en-IN")}.00</div>
          <span className="text-[9px] text-[#22C55E] font-mono uppercase tracking-widest block mt-1">✓ Secure Proxy Connection</span>
        </div>

        {/* Content body */}
        <div className="p-5 flex-1 min-h-[220px]">
          {step === "method" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 font-sans tracking-wide leading-relaxed">
                Choose simulated payment method to test SaaS SaaS limits and compliance audit approvals completely within the container environment.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => setStep("card")}
                  className="w-full p-3 bg-[#0A0D15] hover:bg-[#1E253A] border border-[#252E43] text-left text-xs font-bold font-sans rounded-xl text-white transition flex items-center justify-between"
                >
                  <span>Credit / Debit Cards</span>
                  <span className="text-[9px] font-mono text-[#FF6B35]">No Real Card Required</span>
                </button>

                <button
                  onClick={() => {
                    setStep("loading");
                    setTimeout(() => onSuccess(`pay_upi_${Math.random().toString(36).substring(2, 9)}`), 1000);
                  }}
                  className="w-full p-3 bg-[#0A0D15] hover:bg-[#1E253A] border border-[#252E43] text-left text-xs font-bold font-sans rounded-xl text-white transition flex items-center justify-between"
                >
                  <span>Simulated Instant UPI (GPay/PhonePe)</span>
                  <span className="text-[9px] font-mono text-[#4FC3F7]">Instant Approval</span>
                </button>
              </div>
            </div>
          )}

          {step === "card" && (
            <form onSubmit={handlePay} className="space-y-3">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Mock Visa details</span>
              <input
                type="text"
                placeholder="4111 1111 1111 1111 (Mock Card)"
                value={cardNumber}
                required
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-[#0A0D15] border border-[#252E43] focus:outline-none focus:border-[#FF6B35] text-white font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="MM/YY"
                  required
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="px-3 py-2 text-xs rounded bg-[#0A0D15] border border-[#252E43] focus:outline-none focus:border-[#FF6B35] text-white font-mono text-center"
                />
                <input
                  type="password"
                  placeholder="CVV"
                  required
                  value={cvv}
                  maxLength={3}
                  onChange={(e) => setCvv(e.target.value)}
                  className="px-3 py-2 text-xs rounded bg-[#0A0D15] border border-[#252E43] focus:outline-none focus:border-[#FF6B35] text-white font-mono text-center"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black font-extrabold text-xs uppercase tracking-wide rounded-xl mt-3 transition"
              >
                Trigger OTP Verification
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block font-bold">OTP Dispatched</span>
                <p className="text-[11px] text-gray-400 font-sans">
                  Enter any 4-digit code to simulate banking integration agreement.
                </p>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="1234"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-24 text-center tracking-[0.5rem] text-lg font-black font-mono py-1.5 border border-[#252E43] bg-[#0A0D15] rounded-lg text-[#FF6B35] focus:outline-none focus:ring-1 focus:ring-[#FF6B35]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#22C55E] hover:bg-[#22C55E]/90 text-black font-black text-xs uppercase tracking-wider rounded-xl transition"
              >
                Authenticate Payment
              </button>
            </form>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center p-8 space-y-3 min-h-[160px]">
              <RefreshCw className="w-8 h-8 text-[#FF6B35] animate-spin" />
              <span className="text-xs text-gray-400 font-mono uppercase tracking-widest text-center animate-pulse">
                Engaging Ledger Verification...
              </span>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="bg-[#0A0D15] p-3 text-center border-t border-[#252E43]">
          <span className="text-[9px] text-gray-600 font-mono block">
            Powered by Neptune Proxy Engine &copy; 2026
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SaasBilling({ token, activeOrg, onPlanUpgraded }: BillingProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BillingItem[]>([]);
  const [razorpayConfig, setRazorpayConfig] = useState<any>(null);
  const [testGatewayData, setTestGatewayData] = useState<{ amount: number; planType?: OrgPlan } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load configuration and history logs
  const fetchData = async () => {
    setLoading(true);
    try {
      const configRes = await fetch("/api/v1/billing/razorpay-config", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (configRes.ok) {
        const config = await configRes.json();
        setRazorpayConfig(config);
      }

      const historyRes = await fetch("/api/v1/billing/history", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (historyRes.ok) {
        setHistory(await historyRes.json());
      }
    } catch (e) {
      console.error("Could not pull billing setup records", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrg]);

  // Load Razorpay SDK Script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Upgrades plan via Razorpay or Sandbox proxy
  const handleUpgradePlan = async (plan: OrgPlan, inrAmount: number) => {
    if (activeOrg.plan === plan) {
      setFeedback({ type: "error", message: `Your organization workspace is already operating under the ${plan} plan license.` });
      return;
    }
    setFeedback(null);
    setLoading(true);

    try {
      // 1. Create order ID via server proxy
      const orderRes = await fetch("/api/v1/billing/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "SUBSCRIBE_PLAN",
          planType: plan,
          amount: inrAmount
        })
      });

      if (!orderRes.ok) {
        throw new Error("Could not construct billing order ledger in Razorpay backend.");
      }

      const orderData = await orderRes.json();

      // 2. Play sandbox simulation if order is flagged as simulated, OR if script fails to load
      const rzpLoaded = await loadRazorpayScript();
      if (orderData.isSimulated || !rzpLoaded) {
        // Render beautiful mock gateway overlay in-app to comply with iframe boundaries
        setTestGatewayData({ amount: inrAmount, planType: plan });
        setLoading(false);
        return;
      }

      // 3. Initiate REAL Razorpay Checkout if credentialed key exists
      const options = {
        key: razorpayConfig?.keyId || "rzp_test_Neptune77839",
        amount: Math.round(inrAmount * 100),
        currency: orderData.currency || "INR",
        name: "Neptune SaaS System",
        description: `Upgrade organization workspace to ${plan}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/v1/billing/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                type: "SUBSCRIBE_PLAN",
                planType: plan,
                organizationId: activeOrg.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                isSimulated: false
              })
            });

            if (verifyRes.ok) {
              setFeedback({ type: "success", message: `Perfect! Your organization has been successfully license-upgraded to ${plan}!` });
              onPlanUpgraded();
              fetchData();
            } else {
              setFeedback({ type: "error", message: "Razorpay signature verification was calculated as invalid by our cluster servers." });
            }
          } catch (err: any) {
            setFeedback({ type: "error", message: "Connection issue during receipt validation." });
          }
        },
        prefill: {
          email: activeOrg.createdAt ? "billing@facility.com" : ""
        },
        theme: {
          color: "#FF6B35"
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();

    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Failed to start checkout." });
    } finally {
      setLoading(false);
    }
  };

  // Complete Simulated Callback
  const handleSimulatedSuccess = async (paymentId: string) => {
    if (!testGatewayData?.planType) return;
    const plan = testGatewayData.planType;
    setTestGatewayData(null);
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/v1/billing/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: "SUBSCRIBE_PLAN",
          planType: plan,
          organizationId: activeOrg.id,
          razorpay_payment_id: paymentId,
          isSimulated: true
        })
      });

      if (verifyRes.ok) {
        setFeedback({ type: "success", message: `Simulated Upgrade Approved! Your organization is successfully upgraded to ${plan}!` });
        onPlanUpgraded();
        fetchData();
      } else {
        setFeedback({ type: "error", message: "Mock upgrade validation rejected by server." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Internal connection loop failure during simulated postback." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      
      {/* simulated Razorpay overlay gateway */}
      {testGatewayData && (
        <SimulatedRazorpayGateway
          amount={testGatewayData.amount}
          onCancel={() => setTestGatewayData(null)}
          onSuccess={handleSimulatedSuccess}
        />
      )}

      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#131822] border border-[#1F2733] p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#FF6B35]" />
            Workspace Subscription & Billing
          </h2>
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-1">
            Secure multi-tenant organizational plan management via Razorpay Gateways
          </p>
        </div>

        <div className="text-xs font-mono text-[#94A3B8] flex items-center gap-2">
          {razorpayConfig?.isSandbox ? (
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              Mode: Razorpay Sandbox Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-[10px] font-bold uppercase tracking-wider">
              Mode: Razorpay LIVE Authorized
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {feedback && (
        <div className={`p-4 rounded-xl border text-xs font-semibold font-mono flex items-center gap-3 ${feedback.type === "success" ? "bg-green-500/5 text-green-400 border-green-500/20" : "bg-red-500/5 text-red-400 border-red-500/20"}`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2. Three Tier SaaS Pricing Model */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* starter card */}
        <div className={`border rounded-2xl p-6 relative flex flex-col justify-between ${activeOrg.plan === OrgPlan.STARTER ? "bg-[#181D2D] border-[#FF6B35]" : "bg-[#131822] border-[#1F2733]"}`}>
          {activeOrg.plan === OrgPlan.STARTER && (
            <span className="absolute top-4 right-4 text-[9px] bg-[#FF6B35] text-black font-extrabold font-mono uppercase tracking-wider rounded px-2 py-0.5 animate-pulse">
              Active Plan
            </span>
          )}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Tier 01</span>
              <h3 className="text-lg font-black text-white uppercase mt-0.5">Starter</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 font-medium">For local operators prototyping heat dissipation networks.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black text-white font-mono">Free</span>
              <span className="text-xs text-gray-500 font-mono uppercase block mt-1">₹0 / Month</span>
            </div>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Limit: <strong>1 Facility Asset</strong> max</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Standard map distance search</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                <span>Sandbox Google Drive auditor access</span>
              </li>
            </ul>
          </div>

          <button
            disabled
            className="w-full mt-6 py-2.5 rounded-xl border border-[#1f2733] bg-[#0A0E14] text-gray-500 text-xs font-mono uppercase font-bold"
          >
            {activeOrg.plan === OrgPlan.STARTER ? "Currently Enrolled" : "Included by Default"}
          </button>
        </div>

        {/* GROWTH card */}
        <div className={`border rounded-2xl p-6 relative flex flex-col justify-between ${activeOrg.plan === OrgPlan.GROWTH ? "bg-[#181D2D] border-[#FF6B35]" : "bg-[#131822] border-[#1F2733]"}`}>
          {activeOrg.plan === OrgPlan.GROWTH && (
            <span className="absolute top-4 right-4 text-[9px] bg-[#FF6B35] text-black font-extrabold font-mono uppercase tracking-wider rounded px-2 py-0.5 animate-pulse">
              Active Plan
            </span>
          )}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Tier 02</span>
              <h3 className="text-lg font-black text-[#FF6B35] uppercase mt-0.5">Growth</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 font-medium">Construct complex high-capacity multi-facility energy loops.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black text-white font-mono">₹4,999</span>
              <span className="text-xs text-gray-500 font-mono uppercase block mt-1">INR / Month</span>
            </div>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Support up to <strong>5 Facility Assets</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Active matchmaking algorithm updates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Priority 4-hour customer support response</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleUpgradePlan(OrgPlan.GROWTH, 4999)}
            disabled={loading || activeOrg.plan === OrgPlan.GROWTH || activeOrg.plan === OrgPlan.ENTERPRISE}
            className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold uppercase transition bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black disabled:opacity-40"
          >
            {activeOrg.plan === OrgPlan.GROWTH ? "Active License" : activeOrg.plan === OrgPlan.ENTERPRISE ? "Already upgraded" : "Purchase growth License"}
          </button>
        </div>

        {/* ENTERPRISE card */}
        <div className={`border rounded-2xl p-6 relative flex flex-col justify-between ${activeOrg.plan === OrgPlan.ENTERPRISE ? "bg-[#181D2D] border-[#FF6B35] shadow-[#FF6B35]/15" : "bg-[#131822] border-[#1F2733]"}`}>
          {activeOrg.plan === OrgPlan.ENTERPRISE && (
            <span className="absolute top-4 right-4 text-[9px] bg-[#FF6B35] text-black font-extrabold font-mono uppercase tracking-wider rounded px-2 py-0.5 animate-pulse">
              Active Plan
            </span>
          )}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-gray-400 tracking-widest font-mono flex items-center justify-between">
                <span>Tier 03</span>
                <span className="text-[#FF6B35] flex items-center gap-1"><Sparkles className="w-3 h-3" /> PREMIUM</span>
              </span>
              <h3 className="text-lg font-black text-[#FF6B35] uppercase mt-0.5">Enterprise</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 font-medium">Durable automated auditing portals and white-label regulatory outputs.</p>
            </div>

            <div className="py-2">
              <span className="text-3xl font-black text-white font-mono">₹19,999</span>
              <span className="text-xs text-gray-500 font-mono uppercase block mt-1">INR / Month</span>
            </div>

            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span><strong>Unlimited Asset Assets</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span><strong>Premium Connection: Google Drive auditor</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>Commercial <strong>PDF Compliance report exports</strong></span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleUpgradePlan(OrgPlan.ENTERPRISE, 19999)}
            disabled={loading || activeOrg.plan === OrgPlan.ENTERPRISE}
            className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold uppercase transition bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black disabled:opacity-40"
          >
            {activeOrg.plan === OrgPlan.ENTERPRISE ? "Active License" : "Purchase enterprise license"}
          </button>
        </div>

      </div>

      {/* 3. Payment Invoices History Log */}
      <div className="bg-[#131822] border border-[#1F2733] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1F2733] bg-[#0E131C] flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h3 className="text-xs font-black tracking-wider uppercase text-white font-mono">Account Transaction History</h3>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 font-mono italic">
            No previous financial logs processed in this workspace workspace.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-mono">
              <thead className="text-gray-400 bg-[#0A0D14] uppercase border-b border-[#1F2733] text-[10px]">
                <tr>
                  <th className="py-2.5 px-5">Billing Date</th>
                  <th className="py-2.5 px-5">Invoice Description</th>
                  <th className="py-2.5 px-5">Authorization ID</th>
                  <th className="py-2.5 px-5">Settled Fee</th>
                  <th className="py-2.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2733]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-[#1E253A]/15 transition">
                    <td className="py-3 px-5 text-gray-400">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="py-3 px-5 text-white font-semibold">{record.purpose}</td>
                    <td className="py-3 px-5 text-gray-500 select-all font-mono text-[10px]">{record.paymentId}</td>
                    <td className="py-3 px-5 text-[#22C55E] font-bold">₹{record.amount.toLocaleString()}</td>
                    <td className="py-3 px-5 text-right">
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider bg-green-500/10 text-green-400 uppercase border border-green-500/20">
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
