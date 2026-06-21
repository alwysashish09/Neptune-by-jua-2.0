/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Cookie, ShieldAlert, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CookieConsentProps {
  onConsentChange?: (consent: { standard: boolean; analytics: boolean }) => void;
}

export default function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [show, setShow] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("neptune_cookie_consent");
    if (!saved) {
      // Delay display slightly for nice fluid entering sequence
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (onConsentChange) onConsentChange(parsed);
      } catch (e) {
        setShow(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const preferences = { standard: true, analytics: true };
    localStorage.setItem("neptune_cookie_consent", JSON.stringify(preferences));
    if (onConsentChange) onConsentChange(preferences);
    setShow(false);
  };

  const handleRejectAll = () => {
    const preferences = { standard: true, analytics: false };
    localStorage.setItem("neptune_cookie_consent", JSON.stringify(preferences));
    if (onConsentChange) onConsentChange(preferences);
    setShow(false);
  };

  const handleSavePreferences = () => {
    const preferences = { standard: true, analytics: analyticsEnabled };
    localStorage.setItem("neptune_cookie_consent", JSON.stringify(preferences));
    if (onConsentChange) onConsentChange(preferences);
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md bg-[#0D121B] border border-[#161F30]/90 p-5 rounded-2xl shadow-2xl z-50 font-sans">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-[#FF6B35]/10 border border-[#FF6B35]/20 flex items-center justify-center">
              <Cookie className="h-5 w-5 text-[#FF6B35]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-tight">EU GDPR Cookie & Consent Gate</h4>
              <p className="text-xs text-gray-400 leading-relaxed mt-1 font-medium">
                Neptune uses secure standard authentication cookies and local telemetry state to audit waste heat grids and enable secure Razorpay SaaS transactions.
              </p>
            </div>
          </div>

          {customize ? (
            <div className="p-3 bg-[#070A0F] border border-[#1F2733] rounded-xl space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white uppercase">SaaS System Cookies</div>
                  <div className="text-[10px] text-gray-500 font-mono">Authentication and JWT tokens. Mandatory for security.</div>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-bold font-mono tracking-wider rounded bg-[#22C55E]/10 text-[#22C55E] uppercase border border-[#22C55E]/30 shrink-0 select-none">
                  REQUIRED
                </span>
              </div>

              <div className="flex justify-between items-center gap-4 pt-2 border-t border-[#1F2733]">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white uppercase">Analytics & Telemetry Cookies</div>
                  <div className="text-[10px] text-gray-500 font-mono">Heat map optimization metrics & contract auditing logs.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`px-3 py-1 text-[9px] font-bold font-mono rounded border transition ${analyticsEnabled ? "bg-[#FF6B35]/15 text-[#FF6B35] border-[#FF6B35]/40" : "bg-gray-800 text-gray-400 border-transparent"}`}
                >
                  {analyticsEnabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            {customize ? (
              <button
                type="button"
                onClick={handleSavePreferences}
                className="w-full py-2 bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black font-semibold text-xs tracking-wide uppercase transition rounded flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Save Preferences
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full py-2 bg-[#FF6B35] hover:bg-[#FF6B35]/95 text-black font-semibold text-xs tracking-wide uppercase transition rounded flex items-center justify-center gap-1 cursor-pointer"
              >
                Accept All Cookies
              </button>
            )}

            <div className="flex gap-2">
              {!customize && (
                <button
                  type="button"
                  onClick={() => setCustomize(true)}
                  className="flex-1 py-1.5 border border-[#1F2733] bg-[#070A0F] text-gray-400 hover:text-white text-[10px] uppercase font-mono tracking-wider transition rounded"
                >
                  Customize
                </button>
              )}
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex-1 py-1.5 border border-[#1F2733]/60 text-gray-500 hover:text-white text-[10px] uppercase font-mono tracking-wider transition rounded"
              >
                Reject Third-Party
              </button>
            </div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
