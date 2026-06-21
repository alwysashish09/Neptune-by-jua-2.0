import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Trash2, Shield, Copy, Check, ExternalLink, 
  Settings, CreditCard, Mail, ArrowRight, CheckCircle2, AlertCircle 
} from "lucide-react";
import { Organization, OrgMember, SeatRole, OrgPlan } from "../types.js";

interface TeamSettingsProps {
  token: string;
  activeOrg: Organization & { seatRole?: SeatRole };
  onOrgUpdated: () => void;
}

export default function TeamSettings({ token, activeOrg, onOrgUpdated }: TeamSettingsProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<SeatRole>(SeatRole.OPERATOR);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit organization states
  const [orgName, setOrgName] = useState(activeOrg.name);
  const [updatingOrg, setUpdatingOrg] = useState(false);

  const currentUserRole = activeOrg.seatRole || SeatRole.VIEWER;
  const isOrgAdmin = currentUserRole === SeatRole.ADMIN;

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/organizations/${activeOrg.id}/members`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-Organization-ID": activeOrg.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      } else {
        const errData = await res.json();
        setError(errData?.error?.message || "Could not fetch team representatives.");
      }
    } catch (e) {
      setError("Network interruption while retrieving team list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    setOrgName(activeOrg.name);
    setGeneratedLink(null);
  }, [activeOrg]);

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setUpdatingOrg(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/organizations`, {
        method: "POST", // Simple recreate or rename implementation via post
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: orgName.trim(), plan: activeOrg.plan })
      });
      if (res.ok) {
        setSuccess("Organization workspace template set successfully.");
        onOrgUpdated();
      } else {
        const errData = await res.json();
        setError(errData?.error?.message || "Could not update organization settings.");
      }
    } catch (e) {
      setError("Network connection failure during settings update.");
    } finally {
      setUpdatingOrg(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError(null);
    setSuccess(null);
    setGeneratedLink(null);

    try {
      const res = await fetch(`/api/v1/organizations/${activeOrg.id}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Organization-ID": activeOrg.id
        },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), seatRole: inviteRole })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Invitation successfully generated for ${inviteEmail}!`);
        setGeneratedLink(data.inviteLink);
        setInviteEmail("");
        fetchMembers();
      } else {
        setError(data?.error?.message || "Could not generate organization invitation.");
      }
    } catch (e) {
      setError("Network error while transmitting invitation request.");
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, newRole: SeatRole) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/organizations/${activeOrg.id}/members/${targetUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Organization-ID": activeOrg.id
        },
        body: JSON.stringify({ seatRole: newRole })
      });
      if (res.ok) {
        setSuccess("Team member seat role updated successfully.");
        fetchMembers();
      } else {
        const errData = await res.json();
        setError(errData?.error?.message || "Could not update seat role privileges.");
      }
    } catch (e) {
      setError("Network error encountered during role update.");
    }
  };

  const handleDeleteMember = async (targetUserId: string) => {
    if (!window.confirm("Are you sure you want to remove this member from the organization?")) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/organizations/${activeOrg.id}/members/${targetUserId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Organization-ID": activeOrg.id
        }
      });
      if (res.ok) {
        setSuccess("Team member removed from authorized roster.");
        fetchMembers();
      } else {
        const errData = await res.json();
        setError(errData?.error?.message || "Could not remove member.");
      }
    } catch (e) {
      setError("Connection failure while removing team member.");
    }
  };

  const copyLinkToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#1F2733] pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase text-white">Team Operations & Settings</h2>
          <p className="text-xs font-mono text-[#FF6B35] mt-1 uppercase tracking-wider">
            Multi-Tenant Compliance Seat Licensing — Currently operating as <span className="font-bold underline">{currentUserRole}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#131822] border border-[#1F2733] px-3.5 py-1.5 rounded-lg text-xs font-mono text-[#94A3B8]">
          <CreditCard className="w-4 h-4 text-[#FF6B35]" />
          <span>Active Plan: <span className="text-white font-bold">{activeOrg.plan}</span></span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column - Org Metadata and Invite Forms */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Org Workspace naming card */}
          <div className="bg-[#131822] border border-[#1F2733] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/2 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-4">
              <Settings className="w-5 h-5 text-[#FF6B35]" />
              <h3 className="font-bold uppercase font-mono text-[#94A3B8] tracking-widest text-xs">Tenant Scope settings</h3>
            </div>
            
            <form onSubmit={handleUpdateOrgName} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Organization Context Name</label>
                <input 
                  type="text" 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isOrgAdmin || updatingOrg}
                  className="w-full px-3 py-2 text-xs rounded bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition font-sans disabled:opacity-50"
                  placeholder="Organization Workspace Name"
                />
              </div>

              {isOrgAdmin ? (
                <button
                  type="submit"
                  disabled={updatingOrg || !orgName.trim() || orgName === activeOrg.name}
                  className="w-full py-2 px-3 text-xs font-bold rounded bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black transition flex items-center justify-center gap-1 disabled:opacity-30"
                >
                  {updatingOrg ? "Saving Settings..." : "Sync Workspace Registry"}
                </button>
              ) : (
                <p className="text-[10px] text-gray-500 font-mono italic">Only Workspace Administrators can change context properties.</p>
              )}
            </form>
          </div>

          {/* Org Invitation dispatch card */}
          <div className="bg-[#131822] border border-[#1F2733] rounded-2xl p-6 relative">
            <div className="flex items-center gap-2.5 mb-4">
              <UserPlus className="w-5 h-5 text-[#4FC3F7]" />
              <h3 className="font-bold uppercase font-mono text-[#94A3B8] tracking-widest text-xs">Invite Team Representative</h3>
            </div>

            {isOrgAdmin ? (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. rep@facility.io"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#4FC3F7] transition font-sans"
                    />
                    <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Operational Seat Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as SeatRole)}
                    className="w-full px-3 py-2 text-xs rounded bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#4FC3F7] transition"
                  >
                    <option value={SeatRole.VIEWER}>Viewer (Read-only, no configuration keys)</option>
                    <option value={SeatRole.OPERATOR}>Operator (Can edit heat profile targets)</option>
                    <option value={SeatRole.ADMIN}>Administrator (Full privileges + active seat management)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-3 text-xs font-black rounded bg-[#4FC3F7] hover:bg-[#4FC3F7]/95 text-black transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  Generate Private Invitation Token
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#1F2733] bg-[#0A0E14]/30 text-center">
                <AlertCircle className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                <p className="text-xs text-gray-400 font-sans">
                  Private invitations require administrator privileges. Your current role is <span className="text-[#FF6B35] font-bold">{currentUserRole}</span>.
                </p>
              </div>
            )}

            {/* Generated token output box */}
            {generatedLink && (
              <div className="mt-5 p-3.5 rounded-xl border border-green-500/20 bg-green-500/5 space-y-3">
                <div className="flex items-center justify-between text-xs text-green-300 font-bold">
                  <span>INVITATION TO REGISTER LIVE:</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono uppercase bg-green-500/10 px-2 py-0.5 rounded text-green-400">
                    <Check className="w-3 h-3" /> Ready
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                  The invitation context has been registered. Share this URL with your teammate:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-2.5 py-1.5 text-[10px] font-mono rounded bg-[#0A0E14] border border-green-500/30 text-green-200 select-all"
                  />
                  <button
                    onClick={copyLinkToClipboard}
                    className="p-2 rounded bg-green-500 hover:bg-green-600 text-black transition shrink-0"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column - Team Members directory table */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-mono flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {success && !generatedLink && (
            <div className="p-3.5 rounded-lg border border-green-500/20 bg-green-500/5 text-xs text-green-400 font-mono flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-green-500" />
              <span>{success}</span>
            </div>
          )}

          <div className="bg-[#131822] border border-[#1F2733] rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-[#1F2733] bg-[#161C27] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF6B35]" />
                <h3 className="font-bold text-sm tracking-tight text-white uppercase">WORKSPACE ENROLLED REPRESENTATIVES</h3>
              </div>
              <span className="text-[10px] bg-[#1F2733] text-gray-400 font-mono py-1 px-2.5 rounded-full uppercase tracking-wider">
                {members.length} Seat{members.length === 1 ? "" : "s"} Active
              </span>
            </div>

            {loading && members.length === 0 ? (
              <div className="p-10 text-center font-mono text-xs text-gray-500">
                Synchronizing live LDAP rosters...
              </div>
            ) : members.length === 0 ? (
              <div className="p-10 text-center font-mono text-xs text-gray-500">
                No active representative seats detected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1F2733] text-[10px] font-mono text-gray-400 uppercase bg-[#0E131C] tracking-wider">
                      <th className="py-3 px-6">Teammate Representative</th>
                      <th className="py-3 px-6">Operational privileges</th>
                      <th className="py-3 px-6">State</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2733] bg-[#131822]">
                    {members.map((member) => {
                      const isPending = !member.acceptedAt;
                      
                      return (
                        <tr key={member.id} className="hover:bg-[#1C2332]/25 transition">
                          {/* Teammate */}
                          <td className="py-4 px-6">
                            <div className="font-semibold text-white">{member.email}</div>
                            <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                              {isPending ? `Invited on ${new Date(member.invitedAt).toLocaleDateString()}` : `Seat bounded on ${new Date(member.acceptedAt!).toLocaleDateString()}`}
                            </div>
                          </td>

                          {/* Privilege/Seat Role */}
                          <td className="py-4 px-6">
                            {isOrgAdmin && member.userId ? (
                              <select
                                value={member.seatRole}
                                onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value as SeatRole)}
                                className="bg-[#0A0E14] border border-[#1F2733] text-white text-[11px] rounded px-2.5 py-1 focus:outline-none focus:border-[#FF6B35] transition font-semibold"
                              >
                                <option value={SeatRole.VIEWER}>Viewer</option>
                                <option value={SeatRole.OPERATOR}>Operator</option>
                                <option value={SeatRole.ADMIN}>Admin</option>
                              </select>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-white uppercase">
                                <Shield className="w-3.5 h-3.5 text-[#FF6B35]" />
                                {member.seatRole}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${isPending ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"}`}>
                              {isPending ? "Pending" : "Active"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            {isOrgAdmin ? (
                              <button
                                onClick={() => handleDeleteMember(member.userId || "")}
                                className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition shrink-0 inline-flex items-center justify-center cursor-pointer"
                                title="Remove team Representative Seat"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-gray-500 block italic pr-2">Locked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
