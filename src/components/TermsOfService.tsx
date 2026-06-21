/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Hammer, Scale, CreditCard, ShieldAlert, ArrowLeft } from "lucide-react";

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 font-sans text-gray-300 space-y-8 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1F2733] pb-6 gap-4">
        <div>
          <button 
            onClick={onBack}
            className="text-xs font-mono text-[#FF6B35] hover:underline uppercase tracking-wider mb-2 flex items-center gap-1 cursor-pointer bg-transparent border-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Neptune Terms of Service</h1>
          <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
            Last modified: June 21, 2026 | Commercial Grid Participation License and Agreements
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#131822] border border-[#1F2733] px-3 py-1.5 rounded-lg text-xs font-mono text-amber-500">
          <Scale className="w-4 h-4 text-amber-500" />
          <span>LEGAL AGREEMENT</span>
        </div>
      </div>

      {/* Main contract terms list */}
      <div className="bg-[#131822] border border-[#1F2733] rounded-2xl p-8 space-y-6 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Hammer className="w-4 h-4 text-[#FF6B35]" />
            <h2 className="text-base uppercase tracking-tight">1. Services and License Grants</h2>
          </div>
          <p>
            Neptune grants Authorized Workspace Operators a non-exclusive, non-transferable, revocable license to access our thermal exchange platform, generate nearby matches, link Google Workspace compliance documents, and execute thermal purchase agreements. You agree that state calculations are models of physical pipe flow dissipation and do not constitute absolute structural thermal guarantees.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <CreditCard className="w-4 h-4 text-[#4FC3F7]" />
            <h2 className="text-base uppercase tracking-tight">2. Commercial SaaS Subscriptions</h2>
          </div>
          <p>
            By establishing an active organization on Neptune, you agree to comply with our modern triple-plan subscription constraints:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            <div className="p-4 bg-[#0A0E14] border border-[#1F2733] rounded-xl text-xs space-y-1">
              <span className="font-bold text-white uppercase font-sans">Starter Plan (Free)</span>
              <p className="text-gray-500">Limited to <strong>1 physical facility asset</strong> and basic match view. Simulated trading operations only.</p>
            </div>
            <div className="p-4 bg-[#0A0E14] border border-[#1F2733] rounded-xl text-xs space-y-1">
              <span className="font-bold text-[#FF6B35] uppercase font-sans">Growth Plan (₹4,999/mo)</span>
              <p className="text-gray-500">Supports up to <strong>5 facility assets</strong>, active contract flow, and dedicated support.</p>
            </div>
            <div className="p-4 bg-[#0A0E14] border border-[#1F2733] rounded-xl text-xs space-y-1">
              <span className="font-bold text-[#4FC3F7] uppercase font-sans font-black">Enterprise Plan (₹19,999/mo)</span>
              <p className="text-gray-500">Unlocks <strong>unlimited facility assets</strong>, Google Workspace Drive connector, and certified PDF downloads.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <CreditCard className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-base uppercase tracking-tight">3. Heat Grid Transaction Fees</h2>
          </div>
          <p>
            As a condition of executing official carbon offset compliance certifications, a transaction fee of <strong>1.5%</strong> (or rate specified in active market quotes) is assessed on every Gigajoule (GJ) of heat safely transferred. This transaction fee must be processed and authenticated via <strong>Razorpay</strong> before cryptographic validation certificates are signed and registered into the database history.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <h2 className="text-base uppercase tracking-tight">4. Payment Disputes and Razorpay Integrity</h2>
          </div>
          <p>
            All SaaS subscriptions, upgrades, and volume-based transaction settlements are processed strictly through Razorpay's proxy secure layer. No refunds are issued for carbon credits generated on settled physical heat volumes once cryptographic validation has been authorized. Dispute calculations shall be directed to { "teamashish2005@gmail.com" } with associated order logs.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Scale className="w-4 h-4 text-amber-500" />
            <h2 className="text-base uppercase tracking-tight">5. Madhya Pradesh Green Board Authority</h2>
          </div>
          <p>
            These conditions are governed by and construed in accordance with the laws governing digital services and environmental carbon shifts of Maharashtra, Madhya Pradesh, and Union Territorial codes of India, without reference to conflict of laws principles.
          </p>
        </section>
      </div>

      {/* Action Footer */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold uppercase text-xs tracking-wider rounded transition font-mono cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
