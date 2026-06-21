/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { 
  Flame, LogOut, Compass, LayoutDashboard, MapPin, Handshake, 
  User, ShieldAlert, KeyRound, Mail, ArrowRight, Layers, HelpCircle,
  Users, RefreshCw, PlusCircle, CheckCircle2, AlertTriangle, Cloud, CreditCard
} from "lucide-react";
import LandingPage from "./components/LandingPage.js";
import Onboarding from "./components/Onboarding.js";
import Dashboard from "./components/Dashboard.js";
import TradingContracts from "./components/TradingContracts.js";
import MapCanvas from "./components/MapCanvas.js";
import TeamSettings from "./components/TeamSettings.js";
import DriveAuditor from "./components/DriveAuditor.js";
import CookieConsent from "./components/CookieConsent.js";
import PrivacyPolicy from "./components/PrivacyPolicy.js";
import TermsOfService from "./components/TermsOfService.js";
import SaasBilling from "./components/SaaSBilling.js";
import { Facility, Match, Role, SeatRole } from "./types.js";

type MainView = "landing" | "login" | "register" | "onboarding" | "dashboard" | "match" | "trading" | "team" | "drive" | "billing" | "privacy" | "terms";

export default function App() {
  const [view, setView] = useState<MainView>("landing");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [sseData, setSseData] = useState<any>(null);

  // Multi-tenant organization states
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrg, setActiveOrg] = useState<any | null>(null);
  const [inviteNotification, setInviteNotification] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  // LoginForm states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>(Role.DATA_CENTER);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Map state
  const [mapRadius, setMapRadius] = useState<number>(5);
  const [matches, setMatches] = useState<Match[]>([]);

  // Load organizations
  const loadOrganizations = async (authToken: string, targetOrgId?: string) => {
    try {
      const res = await fetch("/api/v1/organizations", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        if (data.length > 0) {
          const savedOrgId = targetOrgId || localStorage.getItem("neptune_active_org_id");
          const found = data.find((o: any) => o.id === savedOrgId);
          const nextActive = found || data[0];
          setActiveOrg(nextActive);
          localStorage.setItem("neptune_active_org_id", nextActive.id);
        } else {
          setActiveOrg(null);
        }
      }
    } catch (e) {
      console.error("Failed to load organizations", e);
    }
  };

  // Load persistence
  useEffect(() => {
    const savedToken = localStorage.getItem("neptune_token");
    const savedUser = localStorage.getItem("neptune_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView("dashboard");
      loadOrganizations(savedToken);
    }
  }, []);

  // Listen for success message from popup (Google Callback or Sandbox Simulation)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow AI Studio preview subdomains and safe local testing
      if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const { token: googleToken, user: googleUser, googleAccessToken: gAccessToken } = event.data;
        if (googleToken && googleUser) {
          localStorage.setItem("neptune_token", googleToken);
          localStorage.setItem("neptune_user", JSON.stringify(googleUser));
          setToken(googleToken);
          setUser(googleUser);
          if (gAccessToken) {
            setGoogleAccessToken(gAccessToken);
          }
          loadOrganizations(googleToken);
          
          // Probe if they have registered operations in Bhopal grid yet
          fetch("/api/v1/facilities?mine=true", {
            headers: { "Authorization": `Bearer ${googleToken}` }
          })
          .then(res => res.json())
          .then(facilities => {
            if (!facilities || facilities.length === 0) {
              setView("onboarding");
            } else {
              setView("dashboard");
            }
          })
          .catch(() => {
            setView("dashboard");
          })
          .finally(() => {
            setAuthLoading(false);
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleGoogleLogin = async (selectedRole?: Role) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const roleParam = selectedRole ? `?role=${encodeURIComponent(selectedRole)}` : `?role=${encodeURIComponent(regRole)}`;
      const res = await fetch(`/api/v1/auth/google/url${roleParam}`);
      if (!res.ok) {
        throw new Error("Could not fetch Google login credentials from server.");
      }
      const { url } = await res.json();
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        "neptune_google_auth",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!authWindow) {
        throw new Error("Login Popup was blocked! Please enable popups in your browser settings to continue.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to launch Google auth window");
      setAuthLoading(false);
    }
  };

  // Fetch facilities directory
  const loadFacilities = async (authToken: string, orgId?: string) => {
    try {
      const headers: any = { "Authorization": `Bearer ${authToken}` };
      if (orgId) {
        headers["X-Organization-ID"] = orgId;
      }
      const res = await fetch("/api/v1/facilities?mine=true", { headers });
      if (res.ok) {
        const data = await res.json();
        setFacilities(data);
        if (data.length > 0) {
          const dc = data.find((f: any) => f.type === "DATA_CENTER");
          setSelectedFacility(dc || data[0]);
        } else {
          setSelectedFacility(null);
        }
      }
    } catch (e) {
      console.error("Directory sync failed", e);
    }
  };

  useEffect(() => {
    if (token) {
      if (activeOrg) {
        loadFacilities(token, activeOrg.id);
      } else {
        loadFacilities(token);
      }
    }
  }, [token, activeOrg]);

  // Handle cross-component requests to refresh facility list
  useEffect(() => {
    const handleRefresh = () => {
      if (token) {
        if (activeOrg) {
          loadFacilities(token, activeOrg.id);
        } else {
          loadFacilities(token);
        }
      }
    };
    window.addEventListener("refresh-facilities", handleRefresh);
    return () => window.removeEventListener("refresh-facilities", handleRefresh);
  }, [token, activeOrg]);

  // Handle invitation query token accepting
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("inviteToken");
    if (inviteToken) {
      const storedToken = localStorage.getItem("neptune_token") || token;
      if (storedToken) {
        setAuthLoading(true);
        fetch("/api/v1/organizations/invitations/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${storedToken}`
          },
          body: JSON.stringify({ token: inviteToken })
        }).then(res => {
          if (res.ok) {
            setInviteNotification({
              status: "success",
              message: "Congratulations! You have successfully joined the organization team."
            });
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            loadOrganizations(storedToken);
          } else {
            return res.json().then(errData => {
              setInviteNotification({
                status: "error",
                message: errData?.error?.message || "Verification of this invitation link has failed or expired."
              });
            });
          }
        }).catch(err => {
          setInviteNotification({
            status: "error",
            message: "A network error occurred while accepting team invitation."
          });
        }).finally(() => {
          setAuthLoading(false);
        });
      } else {
        setInviteNotification({
          status: "success",
          message: "You have a pending organization invite. Please log in or register to join the team!"
        });
      }
    }
  }, [token]);

  // Handle SSE continuous network connection on login
  useEffect(() => {
    if (!token) return;

    console.log("🔋 Plugging into Neptune SSE Broadcaster...");
    const url = "/api/v1/stream";
    const sse = new EventSource(url);

    sse.onopen = () => {
      console.log("✅ SSE Pipe established successfully!");
    };

    sse.addEventListener("thermal:update", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setSseData({ event: "thermal:update", data });

        // Update local memory representations of thermal profile targets
        setFacilities(prev => prev.map(f => {
          if (f.id === data.facilityId && f.thermalProfile) {
            return {
              ...f,
              thermalProfile: {
                ...f.thermalProfile,
                currentExitTempC: data.currentExitTempC,
                currentLoadPercent: data.currentLoadPercent,
                availableThermalOutputMWth: data.availableThermalOutputMWth
              }
            };
          }
          return f;
        }));
      } catch (err) {
        console.error("Failed to digest SSE payload", err);
      }
    });

    sse.addEventListener("ticker:update", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setSseData({ event: "ticker:update", data });
      } catch (err) {
        console.error("Failed to digest ticker update", err);
      }
    });

    sse.onerror = (err) => {
      console.warn("SSE encountered line interrupt, reconnecting...", err);
    };

    return () => {
      sse.close();
      console.log("🛑 Unplugged from Neptune SSE stream");
    };
  }, [token]);

  // Load nearby match listings for selecting map matches
  const fetchMapMatches = async () => {
    if (!token || !selectedFacility) return;
    try {
      const res = await fetch(`/api/v1/matches/nearby?facilityId=${selectedFacility.id}&radiusKm=${mapRadius}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error("Could not fetch map linkages", e);
    }
  };

  useEffect(() => {
    if (view === "match" || selectedFacility) {
      fetchMapMatches();
    }
  }, [selectedFacility, mapRadius, view]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Login authentication rejected");
      }

      localStorage.setItem("neptune_token", data.token);
      localStorage.setItem("neptune_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      loadOrganizations(data.token);
      setView("dashboard");
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate session");
    } finally {
      setAuthLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: regRole })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Could not spin up user profile");
      }

      localStorage.setItem("neptune_token", data.token);
      localStorage.setItem("neptune_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      loadOrganizations(data.token);
      
      // Route new registry directly into the onboarding wizard!
      setView("onboarding");
    } catch (err: any) {
      setAuthError(err.message || "Registration sequence failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    localStorage.removeItem("neptune_token");
    localStorage.removeItem("neptune_user");
    localStorage.removeItem("neptune_active_org_id");
    setToken(null);
    setUser(null);
    setFacilities([]);
    setSelectedFacility(null);
    setOrganizations([]);
    setActiveOrg(null);
    setView("landing");
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white flex flex-col font-sans select-none">
      
      {/* 1. MARKETING LANDING PAGE VIEW */}
      {view === "landing" && (
        <LandingPage onNavigate={(target) => setView(target as MainView)} />
      )}

      {/* 2. AUTHENTICATION PAGES (LOGIN / REGISTER) */}
      {(view === "login" || view === "register") && (
        <div className="min-h-screen bg-[#0A0E14] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF6B35]/10 via-[#0A0E14]_60% to-[#0A0E14] pointer-events-none" />

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center mb-4">
              <div 
                onClick={() => setView("landing")}
                className="w-12 h-12 rounded-xl bg-[#131822] border border-[#1F2733] flex items-center justify-center cursor-pointer hover:border-[#FF6B35] transition"
              >
                <Flame className="w-6 h-6 text-[#FF6B35]" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-medium tracking-tight">
              {view === "login" ? "Sign In to Neptune" : "Spin Up Platform Account"}
            </h2>
            <p className="mt-2 text-center text-sm text-[#94A3B8]">
              Industrial Waste Heat Compliance & Trade Ledger
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-[#131822] py-8 px-4 border border-[#1F2733] shadow-xl rounded-2xl sm:px-10">
              
              {authError && (
                <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={view === "login" ? handleLogin : handleRegister} className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">Email address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@facility.io"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-sans"
                    />
                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-mono"
                    />
                    <KeyRound className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {view === "register" && (
                  <div>
                    <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">Operational Role</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as Role)}
                      className="w-full px-4 py-3 rounded-lg bg-[#0A0E14] border border-[#1F2733] text-white focus:outline-none focus:border-[#FF6B35] transition text-sm font-sans"
                    >
                      <option value={Role.DATA_CENTER}>Heat Supplier (Data Center / Boiler Emitter)</option>
                      <option value={Role.HEAT_BUYER}>Heat Sink (District Grid / Greenhouse Utility)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 px-4 rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black font-semibold transition flex items-center justify-center gap-1 text-sm shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50"
                >
                  {authLoading ? "Synchronizing Key..." : view === "login" ? "Verify Security Token" : "Generate Account Signature"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1F2733]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-mono">
                  <span className="bg-[#131822] px-3 text-[#64748B]">Or secure access via</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin(view === "login" ? undefined : regRole)}
                disabled={authLoading}
                className="w-full py-3 px-4 rounded bg-white hover:bg-white/95 text-black font-bold transition flex items-center justify-center gap-2.5 text-sm shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="mt-6 flex justify-between text-xs font-mono">
                {view === "login" ? (
                  <>
                    <span className="text-[#64748B]">New facility manager?</span>
                    <button onClick={() => setView("register")} className="text-[#FF6B35] hover:underline">Register Onboard</button>
                  </>
                ) : (
                  <>
                    <span className="text-[#64748B]">Existing licensee?</span>
                    <button onClick={() => setView("login")} className="text-[#FF6B35] hover:underline">Secure Login</button>
                  </>
                )}
              </div>

              <div className="mt-8 text-center text-[11px] font-mono text-[#64748B] space-x-2 border-t border-[#1F2733] pt-4">
                <button onClick={() => setView("privacy")} className="hover:text-white hover:underline transition">Privacy Policy</button>
                <span>•</span>
                <button onClick={() => setView("terms")} className="hover:text-white hover:underline transition">Terms of Service</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. HARD ONBOARDING COMPLEX STEPS */}
      {view === "onboarding" && token && (
        <Onboarding 
          token={token} 
          onOnboardingComplete={(newFac) => {
            setFacilities(prev => [...prev, newFac]);
            setSelectedFacility(newFac);
            setView("dashboard");
          }}
          onBackToDashboard={() => setView("dashboard")}
        />
      )}

      {/* 4. MAIN PRIVATE SaaS WORKSPACE (DASHBOARD VIEWS) */}
      {token && view !== "onboarding" && view !== "login" && view !== "register" && view !== "landing" && (
        <div className="flex-1 flex flex-col md:flex-row relative">
          
          {/* SIDEBAR NAVIGATION AREA */}
          <aside className="w-full md:w-64 bg-[#131822] border-r border-[#1F2733] flex flex-col justify-between p-5 shrink-0">
            <div className="space-y-6">
              {/* Logo / Brand - Inspired by Design HTML */}
              <div className="flex items-center gap-3 border-b border-[#1F2733] pb-5">
                <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center font-bold text-black text-xl">N</div>
                <div>
                  <h1 className="text-lg font-black tracking-tighter leading-none text-white">NEPTUNE <span className="text-[#FF6B35]">v2.0</span></h1>
                  <p className="text-[9px] text-gray-500 font-mono tracking-widest mt-1">WASTE HEAT NETWORK</p>
                </div>
              </div>

              {/* Active Organization Switcher Dropdown */}
              {organizations.length > 0 && activeOrg && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[9px] font-mono uppercase text-[#94A3B8] tracking-wider">ACTIVE ORGANIZATION</label>
                  <div className="relative">
                    <select
                      value={activeOrg.id}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const found = organizations.find(o => o.id === nextId);
                        if (found) {
                          setActiveOrg(found);
                          localStorage.setItem("neptune_active_org_id", found.id);
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2.5 rounded bg-[#1C202B] border border-[#2B3547] text-[#E2E8F0] text-xs font-bold font-sans cursor-pointer focus:outline-none focus:border-[#FF6B35] transition appearance-none"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.seatRole || "member"})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation list with Bold Typography border-l active indicator */}
              <nav className="space-y-2">
                <button
                  id="nav-dashboard-btn"
                  onClick={() => setView("dashboard")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "dashboard" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <LayoutDashboard className="w-4 h-4 text-[#FF6B35]" />
                  Thermal Twin
                </button>

                <button
                  id="nav-match-btn"
                  onClick={() => setView("match")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "match" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <MapPin className="w-4 h-4 text-[#4FC3F7]" />
                  Geo Match Map
                </button>

                <button
                  id="nav-trading-btn"
                  onClick={() => setView("trading")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "trading" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <Handshake className="w-4 h-4 text-[#22C55E]" />
                  Flow Contracts
                </button>

                <button
                  id="nav-drive-btn"
                  onClick={() => setView("drive")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "drive" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <Cloud className="w-4 h-4 text-[#4285F4]" />
                  Drive Reports
                </button>

                <button
                  id="nav-team-btn"
                  onClick={() => setView("team")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "team" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <Users className="w-4 h-4 text-[#E9D5FF]" />
                  Team Settings
                </button>

                <button
                  id="nav-billing-btn"
                  onClick={() => setView("billing")}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 border-l-4 rounded-r-lg text-xs font-black font-mono tracking-wider uppercase transition ${view === "billing" ? "border-[#FF6B35] bg-[#1F2733]/60 text-white" : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#1C2432]/30"}`}
                >
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  SaaS Billing
                </button>
              </nav>
            </div>

            {/* Bottom Account profile panel */}
            <div className="pt-4 border-t border-[#1F2733] space-y-3">
              <div className="flex justify-between px-2 text-[10px] font-mono text-[#64748B] border-b border-[#1F2733]/45 pb-2">
                <button onClick={() => setView("privacy")} className="hover:text-white transition">Privacy</button>
                <span>•</span>
                <button onClick={() => setView("terms")} className="hover:text-white transition">Terms</button>
              </div>

              <div className="flex items-center gap-3 text-xs pt-1">
                <div className="w-8 h-8 rounded-full bg-[#1F2733] border border-[#FF6B35]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#94A3B8]" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-white truncate max-w-[124px]">{user?.email}</div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest leading-none mt-0.5">{user?.role}</div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0A0E14] border border-[#1F2733] text-gray-400 hover:text-white hover:border-red-500/35 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out / Lock
              </button>
            </div>
          </aside>

          {/* MAIN PAGE VIEW PORTION */}
          <main className="flex-1 bg-[#0A0E14] overflow-y-auto p-6 md:p-8">
            {inviteNotification && (
              <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono font-semibold animate-fadeIn ${
                inviteNotification.status === "success" 
                  ? "bg-green-500/5 border-green-500/20 text-green-400" 
                  : "bg-red-500/5 border-red-500/20 text-red-400"
              }`}>
                <div className="flex items-center gap-2.5">
                  {inviteNotification.status === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0 text-green-400" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />}
                  <span>{inviteNotification.message}</span>
                </div>
                <button 
                  onClick={() => setInviteNotification(null)}
                  className="px-2.5 py-1 text-[10px] uppercase font-bold text-gray-400 hover:text-white bg-[#131822] border border-[#1F2733] rounded transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {view === "dashboard" && (
              <Dashboard 
                token={token}
                facilities={facilities}
                selectedFacility={selectedFacility}
                onSelectFacility={setSelectedFacility}
                onNavigateToOnboarding={() => setView("onboarding")}
                sseData={sseData}
              />
            )}

            {view === "match" && (
              <div className="space-y-6 h-full flex flex-col">
                <div className="flex justify-between items-center border-b border-[#1F2733] pb-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase text-white">Geo Match Platform</h2>
                    <p className="text-xs font-mono text-[#4FC3F7] mt-1 uppercase tracking-wider">Real-time heat loss mapping overlay for Bhopal grid network</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase text-[#94A3B8]">Search Radius:</label>
                    <select
                      value={mapRadius}
                      onChange={(e) => setMapRadius(parseInt(e.target.value))}
                      className="bg-[#131822] border border-[#1F2733] text-white rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#FF6B35] transition font-mono"
                    >
                      <option value={2}>2 km Grid</option>
                      <option value={5}>5 km Grid</option>
                      <option value={10}>10 km Grid</option>
                      <option value={15}>15 km Grid</option>
                    </select>
                  </div>
                </div>

                {/* SVG/Canvas GIS Layout */}
                <div className="h-[430px] md:h-auto md:flex-1">
                  <MapCanvas 
                    facilities={facilities}
                    matches={matches}
                    selectedFacility={selectedFacility}
                    selectedMatch={null}
                    searchRadiusKm={mapRadius}
                    onSelectFacility={(fac) => {
                      if (fac.type === "DATA_CENTER") setSelectedFacility(fac);
                    }}
                  />
                </div>
              </div>
            )}

            {view === "trading" && (
              <TradingContracts 
                token={token}
                facilities={facilities}
                selectedFacility={selectedFacility}
                retriggerDashboardUpdate={() => loadFacilities(token, activeOrg?.id)}
                activeOrg={activeOrg}
                onUpgradeClick={() => setView("billing")}
              />
            )}

            {view === "drive" && (
              <DriveAuditor 
                token={token}
                facilities={facilities}
                selectedFacility={selectedFacility}
                onSelectFacility={setSelectedFacility}
                googleAccessToken={googleAccessToken}
                onTriggerGoogleLogin={() => handleGoogleLogin(Role.DATA_CENTER)}
              />
            )}

            {view === "team" && activeOrg && (
               <TeamSettings 
                 token={token}
                 activeOrg={activeOrg}
                 onOrgUpdated={() => loadOrganizations(token, activeOrg.id)}
               />
            )}

            {view === "billing" && activeOrg && (
              <SaasBilling 
                token={token}
                activeOrg={activeOrg}
                onPlanUpgraded={() => loadOrganizations(token, activeOrg.id)}
              />
            )}

            {view === "privacy" && (
              <PrivacyPolicy 
                onBack={() => setView(token ? "dashboard" : "landing")}
              />
            )}

            {view === "terms" && (
              <TermsOfService 
                onBack={() => setView(token ? "dashboard" : "landing")}
              />
            )}
          </main>
        </div>
      )}

      <CookieConsent />
    </div>
  );
}
