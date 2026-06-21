/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldCheck, Lock, Eye, CheckCircle, ArrowLeft } from "lucide-react";

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
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
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Neptune SaaS Privacy Policy</h1>
          <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">
            Last updated: June 21, 2026 | Compliant with EU GDPR, CCPA & Indian IT Act (Section 43A)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#131822] border border-[#1F2733] px-3 py-1.5 rounded-lg text-xs font-mono text-[#22C55E]">
          <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
          <span>SECURED AUDITING</span>
        </div>
      </div>

      {/* Main clauses list */}
      <div className="bg-[#131822] border border-[#1F2733] rounded-2xl p-8 space-y-6 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Eye className="w-4 h-4 text-[#FF6B35]" />
            <h2 className="text-base uppercase tracking-tight">1. Scope and Core Definition</h2>
          </div>
          <p>
            Neptune ("we", "us", or "our") provides a multi-tenant SaaS thermal reuse marketplace allowing high-density data center emitters to recycle, catalog, and trade waste heat with district heating networks, municipal water grids, and greenhouse complejos. This Privacy Policy documents our practices regarding the acquisition, logging, telemetry monitoring, and secure transmission of organizational metadata and financial transactions.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <Lock className="w-4 h-4 text-[#4FC3F7]" />
            <h2 className="text-base uppercase tracking-tight">2. Information We Collect</h2>
          </div>
          <p>
            To successfully calculate environmental footprints and process subscription billing, we collect the following discrete telemetry items:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-400 text-xs font-mono">
            <li><strong>User Credentials</strong>: Corporate email address, cryptographically hashed passwords, and local workspace privileges (Viewer, Operator, Administrator).</li>
            <li><strong>Facility Telemetry</strong>: Coordinates (Latitude & Longitude), exit water temperatures (°C), cooling grid types, and continuous thermal volume metrics (GJ/h).</li>
            <li><strong>Financial Signatures</strong>: Razorpay checkout session logs, customer identification indexes, and system verification signatures. We DO NOT store raw credit card numbers or banking secrets directly on our servers.</li>
            <li><strong>Google Workspace Audit Links</strong>: Metadata links to official energy validation reports loaded from Google Drive or Google Docs.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-base uppercase tracking-tight">3. Legal Grounding and EU GDPR Compliance</h2>
          </div>
          <p>
            If your organization operates in the European Union (EU) or India, we process thermal data under the standard lawful basis of <strong>Contractual Obligation</strong> (executing and matching commercial transfer agreements) and <strong>Legitimate Business Interest</strong> (helping grid systems optimize cooling loads under the Energy Efficiency Directive). You hold full privileges to review, purge, or extract your seat authorizations at any time inside the Team Settings interface.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <CheckCircle className="w-4 h-4 text-[#FF6B35]" />
            <h2 className="text-base uppercase tracking-tight">4. Third-Party Disclosures and Razorpay API Guard</h2>
          </div>
          <p>
            Billing profiles are securely proxied via safe backend integrations to prevent client-side credential exposure. Token values, Razorpay keys, and settlement triggers are passed exclusively through HTTPS connections to official Razorpay endpoints in compliance with PCI-DSS guidelines.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <CheckCircle className="w-4 h-4 text-[#4FC3F7]" />
            <h2 className="text-base uppercase tracking-tight">5. System Contacts & Auditing Contacts</h2>
          </div>
          <p>
            For compliance concerns, data access requests, or to schedule independent Madhya Pradesh Green Board verification, please email: <strong>{ "teamashish2005@gmail.com" }</strong> or open a session with our designated System Administrator.
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
