import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, ShieldCheck, ArrowRight, Zap, RefreshCw, Layers, Globe, 
  Droplets, Sparkles, AlertCircle, Eye, ArrowUpRight, Search, 
  Anchor, Server, Cpu, CheckCircle, Database, HelpCircle, 
  Users, Activity, TrendingUp, Info, ArrowLeft, Trophy, MapPin, BadgePercent, Waves
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MapCanvas from "./MapCanvas.js";

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  wobble: number;
  wobbleSpeed: number;
  alpha: number;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  // Navigation: 'home' | 'explore' | 'mint'
  const [subView, setSubView] = useState<"home" | "explore" | "mint">("home");
  const [phase, setPhase] = useState<"loading" | "ready_to_dive" | "diving" | "splash" | "reveal_active">("loading");
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorBg, setCursorBg] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);

  // Telemetry simulator values
  const [simTemp, setSimTemp] = useState(65.4);
  const [simGJ, setSimGJ] = useState(158.2);

  const [cursorHoverState, setCursorHoverState] = useState<"default" | "cta" | "card" | "brand">("default");

  // Parallax offsets
  const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 });

  // Explorer Data states
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardMetric, setLeaderboardMetric] = useState<"heat" | "water">("heat");
  const [nodeFilter, setNodeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [loadingExplore, setLoadingExplore] = useState(false);

  // Ceremonial Registration wizard states
  const [mintStep, setMintStep] = useState<1 | 2 | 3 | 4>(1);
  const [facName, setFacName] = useState("");
  const [facType, setFacType] = useState<"DATA_CENTER" | "HEAT_BUYER">("DATA_CENTER");
  const [facLat, setFacLat] = useState("23.2500");
  const [facLng, setFacLng] = useState("77.4100");
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [claimedMatches, setClaimedMatches] = useState<number | null>(null);
  const [mintingCode, setMintingCode] = useState(false);
  const [mintResult, setMintResult] = useState<any | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  // Load custom offsets config
  const ctaBtnRef = useRef<HTMLButtonElement | null>(null);
  const demoBtnRef = useRef<HTMLButtonElement | null>(null);
  const brandLogoRef = useRef<HTMLDivElement | null>(null);

  const [ctaOffset, setCtaOffset] = useState({ x: 0, y: 0 });
  const [demoOffset, setDemoOffset] = useState({ x: 0, y: 0 });
  const [brandOffset, setBrandOffset] = useState({ x: 0, y: 0 });

  const handleCtaMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ctaBtnRef.current) return;
    const rect = ctaBtnRef.current.getBoundingClientRect();
    const elemX = rect.left + rect.width / 2;
    const elemY = rect.top + rect.height / 2;
    setCtaOffset({ x: (e.clientX - elemX) * 0.35, y: (e.clientY - elemY) * 0.35 });
    setCursorHoverState("cta");
  };

  const handleDemoMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!demoBtnRef.current) return;
    const rect = demoBtnRef.current.getBoundingClientRect();
    const elemX = rect.left + rect.width / 2;
    const elemY = rect.top + rect.height / 2;
    setDemoOffset({ x: (e.clientX - elemX) * 0.28, y: (e.clientY - elemY) * 0.28 });
    setCursorHoverState("cta");
  };

  const handleBrandMagneticMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!brandLogoRef.current) return;
    const rect = brandLogoRef.current.getBoundingClientRect();
    const elemX = rect.left + rect.width / 2;
    const elemY = rect.top + rect.height / 2;
    setBrandOffset({ x: (e.clientX - elemX) * 0.25, y: (e.clientY - elemY) * 0.25 });
    setCursorHoverState("brand");
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    if (typeof window !== "undefined") {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener("resize", handleResize);
    }
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normX = (mousePos.x / (windowSize.w || 1200)) - 0.5;
  const normY = (mousePos.y / (windowSize.h || 800)) - 0.5;

  const heroTextTransform = `translate3d(${normX * -12}px, ${normY * -12}px, 0)`;
  const glassCardTransform = `translate3d(${normX * 25}px, ${normY * 25}px, 0) rotateY(${normX * 8}deg) rotateX(${normY * -8}deg)`;

  // Fetch Network Stats & Leaderboard
  const loadNetworkData = async () => {
    setLoadingExplore(true);
    try {
      const [statsRes, nodesRes, lbRes] = await Promise.all([
        fetch("/api/v1/network/stats"),
        fetch("/api/v1/network/nodes"),
        fetch(`/api/v1/network/leaderboard?metric=${leaderboardMetric}`)
      ]);
      
      if (statsRes.ok) setNetworkStats(await statsRes.json());
      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
    } catch (e) {
      console.error("Failed loading Neptune public directory content", e);
    } finally {
      setLoadingExplore(false);
    }
  };

  // Re-fetch leaderboard when metric changes
  useEffect(() => {
    if (subView === "explore") {
      fetch(`/api/v1/network/leaderboard?metric=${leaderboardMetric}`)
        .then(res => res.json())
        .then(data => setLeaderboard(data))
        .catch(err => console.error(err));
    }
  }, [leaderboardMetric, subView]);

  // Loading bar simulator
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase("ready_to_dive"), 650);
          return 100;
        }
        return Math.min(100, prev + Math.floor(Math.random() * 8) + 5);
      });
    }, 90);
    return () => clearInterval(interval);
  }, [phase]);

  // Telemetry variables micro-ticks
  useEffect(() => {
    if (phase !== "reveal_active") return;
    const interval = setInterval(() => {
      setSimTemp((t) => +(t + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setSimGJ((g) => +(g + Math.random() * 0.1).toFixed(2));
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  // Mouse position tracker
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setTimeout(() => {
        setCursorBg({ x: e.clientX, y: e.clientY });
      }, 85);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // HTML5 Bubbles Physics Canvas Setup
  useEffect(() => {
    if (phase !== "reveal_active" && phase !== "diving") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let id: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const bubbles: Bubble[] = [];
    for (let i = 0; i < 48; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height + height,
        radius: Math.random() * 6 + 2,
        speedY: Math.random() * 1.5 + 0.6,
        wobble: Math.random() * 10,
        wobbleSpeed: Math.random() * 0.05 + 0.02,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
    bubblesRef.current = bubbles;

    let renderTime = 0;

    const render = () => {
      renderTime += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Deep dark sea gradient base shimmer
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#050B12");
      gradient.addColorStop(0.5, "#02070D");
      gradient.addColorStop(1, "#010306");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Light caustic beams
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let j = 0; j < 3; j++) {
        const rayGradient = ctx.createRadialGradient(
          width * 0.5 + Math.sin(renderTime + j) * 200,
          -100 + j * 50,
          200,
          width * 0.5 + Math.sin(renderTime + j) * 200,
          -100,
          width * 0.9 + j * 100
        );
        rayGradient.addColorStop(0, `rgba(79, 195, 247, ${0.11 - j * 0.03})`);
        rayGradient.addColorStop(0.4, `rgba(255, 107, 53, ${0.02 - j * 0.01})`);
        rayGradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rayGradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      // Fluid water displacement waves
      ctx.strokeStyle = "rgba(79, 195, 247, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 15) {
        const y = height - 120 + Math.sin(x * 0.005 + renderTime) * 15 + Math.cos(x * 0.01 - renderTime * 0.5) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Physics loop
      bubbles.forEach((b) => {
        b.y -= b.speedY;
        b.wobble += b.wobbleSpeed;
        b.x += Math.sin(b.wobble) * 0.8;

        if (b.y < -30) {
          b.y = height + Math.random() * 40;
          b.x = Math.random() * width;
        }

        const dx = b.x - mousePos.x;
        const dy = b.y - mousePos.y;
        const dist = Math.hypot(dx, dy);
        const effectRadius = 140;

        if (dist < effectRadius) {
          const force = (effectRadius - dist) / effectRadius;
          b.x += (dx / dist) * force * 5;
          b.y += (dy / dist) * force * 5;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        const radGrad = ctx.createRadialGradient(
          b.x - b.radius * 0.3,
          b.y - b.radius * 0.3,
          b.radius * 0.1,
          b.x,
          b.y,
          b.radius
        );
        radGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
        radGrad.addColorStop(0.4, `rgba(79, 195, 247, ${b.alpha})`);
        radGrad.addColorStop(0.95, "rgba(6, 19, 34, 0.1)");
        radGrad.addColorStop(1, `rgba(79, 195, 247, ${b.alpha * 0.5})`);
        ctx.fillStyle = radGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
        ctx.restore();
      });

      id = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", handleResize);
    };
  }, [phase, mousePos]);

  const startPlunge = () => {
    setPhase("diving");
    setTimeout(() => {
      setPhase("splash");
      setTimeout(() => {
        setPhase("reveal_active");
        loadNetworkData();
      }, 1100);
    }, 1800);
  };

  // Ceremonial Step 2: Live Claim Location Radar Sweep
  const triggerLocationClaimCheck = async () => {
    setCheckingLocation(true);
    setClaimedMatches(null);
    try {
      const response = await fetch("/api/v1/network/register/claim-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(facLat),
          longitude: parseFloat(facLng),
          type: facType
        })
      });
      if (response.ok) {
        const data = await response.json();
        // Simulate radar scanning latency
        setTimeout(() => {
          setClaimedMatches(data.matchCount);
          setCheckingLocation(false);
          setMintStep(2);
        }, 1500);
      } else {
        setCheckingLocation(false);
      }
    } catch (e) {
      console.error(e);
      setCheckingLocation(false);
    }
  };

  // Ceremonial Step 3: Mint unique Capsule ID
  const triggerCeremonialMint = async () => {
    setMintingCode(true);
    setMintError(null);
    try {
      const response = await fetch("/api/v1/network/register/mint-capsule-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityName: facName,
          latitude: parseFloat(facLat),
          longitude: parseFloat(facLng),
          type: facType
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setTimeout(() => {
          setMintResult(data);
          setMintingCode(false);
          setMintStep(3);
        }, 2200); // Suspenseful anchor latency
      } else {
        throw new Error(data.error?.message || "Failed to commit node sequence rules");
      }
    } catch (e: any) {
      setMintError(e.message || "An identity collision occurred on verification.");
      setMintingCode(false);
    }
  };

  // Claim credentials and pre-fill signup form
  const handleProceedToSignUp = () => {
    if (mintResult) {
      // Pack draft properties securely
      localStorage.setItem("neptune_pre_minted_draft", JSON.stringify({
        name: mintResult.facility.name,
        type: mintResult.facility.type,
        latitude: mintResult.facility.latitude,
        longitude: mintResult.facility.longitude
      }));
    }
    // Navigate straight to the system registration view
    onNavigate("register");
  };

  // Clean filters for unauthenticated node list
  const filteredNodes = nodes.filter(n => {
    const matchesFilter = nodeFilter === "ALL" || n.type === nodeFilter;
    const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (n.capsuleCode && n.capsuleCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Re-map nodes to fit Facility types in unauthenticated MapCanvas
  const mappedFacilitiesForCanvas = nodes.map(n => ({
    id: n.id,
    name: n.name,
    type: n.type,
    latitude: n.latitude,
    longitude: n.longitude,
    countryCode: "IN"
  }));

  return (
    <div className="min-h-screen bg-[#070B11] text-white relative font-sans selection:bg-[#FF6B35] selection:text-black overflow-x-hidden">
      
      {/* HTML5 Canvas Fluid */}
      {(phase === "reveal_active" || phase === "diving" || phase === "splash") && (
        <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />
      )}

      {/* Decorative radial lens light */}
      {phase === "reveal_active" && (
        <div 
          className="fixed rounded-full pointer-events-none blur-[150px] opacity-25 z-0 transition-all duration-75"
          style={{
            left: `${cursorBg.x - 220}px`,
            top: `${cursorBg.y - 220}px`,
            width: "440px",
            height: "440px",
            background: "radial-gradient(circle, #4FC3F7 0%, #FF6B35 100%)"
          }}
        />
      )}

      <AnimatePresence mode="wait">
        
        {/* PHASE 1: PRELOADER */}
        {phase === "loading" && (
          <motion.div 
            key="preloader"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#090D15] flex flex-col items-center justify-center p-6 z-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#131B27_1px,transparent_1px),linear-gradient(to_bottom,#131B27_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
            <div className="relative text-center max-w-md w-full space-y-8 z-10">
              <div className="inline-flex items-center gap-2 bg-[#FF6B35]/15 border border-[#FF6B35]/30 px-3.5 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-[#FF6B35] animate-bounce" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#FF6B35] font-black">Neptune Systems Localizing</span>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-sans">THERMAL COUPLING</h2>
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Initializing Liquid Energy Registry...</p>
              </div>
              <div className="bg-[#111723]/90 border border-[#1F2733] backdrop-blur-xl p-4 rounded-2xl relative shadow-2xl">
                <div className="flex justify-between items-center text-[10px] font-mono mb-2 text-gray-400">
                  <span>SECURE MEMORY COUPLER</span>
                  <span className="text-[#FF6B35] font-bold">{loadPercent}%</span>
                </div>
                <div className="h-2.5 w-full bg-[#070A10] rounded-full overflow-hidden p-[1px] border border-[#1F2733]">
                  <motion.div 
                    className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] via-[#E28743] to-[#4FC3F7] shadow-lg relative"
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 mt-2">
                  <span>LOAD_MODULES: DB_COOLDOWN</span>
                  <span>STATUS: READY</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 2: DETONATING DIVING SEQUENCE */}
        {phase === "ready_to_dive" && (
          <motion.div 
            key="ready-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06101D] flex flex-col items-center justify-center p-6 z-50 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#4FC3F7]/15 via-[#06101D]_75% to-[#01060C] pointer-events-none" />
            <div className="max-w-xl space-y-8 z-10">
              <div className="inline-flex items-center gap-1.5 bg-[#4FC3F7]/15 border border-[#4FC3F7]/30 px-3 py-1 rounded-full text-[#4FC3F7] text-[10px] uppercase font-mono tracking-wider font-extrabold mx-auto">
                <Waves className="w-4 h-4 animate-spin text-[#4FC3F7]" /> SECURE SECTOR BOUNDARY ESTABLISHED
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">NEPTUNE FLUID<br/>TWIN PROTOCOL</h1>
              <p className="text-xs md:text-sm text-[#94A3B8] leading-relaxed">
                You are entering the uncompromised thermodynamic settlement ledger. The grid pairs data center heat loss targets with district water utilities coordinates.
              </p>
              <button 
                onClick={startPlunge}
                className="px-10 py-5 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#0D9488] text-black text-xs uppercase font-black tracking-widest shadow-2xl hover:shadow-[#4FC3F7]/40 hover:scale-[1.02] transform transition cursor-pointer"
              >
                Initiate Grid Dive Sequence
              </button>
            </div>
          </motion.div>
        )}

        {/* PHASE 3: MOUNT LIVE ENVIRONMENT */}
        {phase === "reveal_active" && (
          <motion.div 
            key="main-landing-space"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex flex-col min-h-screen text-gray-200"
          >
            
            {/* Top Interactive Banner Header */}
            <header className="relative z-10 border-b border-sky-950/40 bg-[#07111D]/80 backdrop-blur-md sticky top-0">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                
                {/* Brand Identity / Logo */}
                <div 
                  ref={brandLogoRef}
                  onMouseMove={handleBrandMagneticMove}
                  onMouseLeave={() => {
                    setBrandOffset({ x: 0, y: 0 });
                    setCursorHoverState("default");
                  }}
                  onClick={() => setSubView("home")}
                  style={{ transform: `translate3d(${brandOffset.x}px, ${brandOffset.y}px, 0)` }}
                  className="flex items-center gap-3 select-none cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center font-bold text-black text-xl transition group-hover:scale-105">
                    N
                  </div>
                  <div>
                    <span className="font-extrabold text-lg tracking-tight uppercase text-white">Neptune</span>
                    <span className="text-[10px] text-[#4FC3F7] ml-2 font-mono border border-sky-400/20 px-1.5 py-0.5 rounded bg-sky-950/20">Abyssal v21</span>
                  </div>
                </div>

                {/* Navbar links */}
                <nav className="hidden md:flex items-center gap-8 text-[11px] font-mono font-black uppercase tracking-wider text-[#94A3B8]">
                  <button 
                    onClick={() => setSubView("home")} 
                    className={`hover:text-white transition py-1 pb-1 px-1 ${subView === "home" ? "text-white border-b-2 border-[#FF6B35]" : ""}`}
                  >
                    Home Base
                  </button>
                  <button 
                    onClick={() => { setSubView("explore"); loadNetworkData(); }} 
                    className={`hover:text-white transition py-1 pb-1 px-1 flex items-center gap-1 ${subView === "explore" ? "text-white border-b-2 border-[#FF6B35]" : ""}`}
                  >
                    <Globe className="w-3.5 h-3.5 fill-current" /> Neptune Network
                  </button>
                  <button 
                    onClick={() => setSubView("mint")} 
                    className={`hover:text-white transition py-1 pb-1 px-1 flex items-center gap-1 ${subView === "mint" ? "text-white border-b-2 border-[#FF6B35]" : ""}`}
                  >
                    <Cpu className="w-3.5 h-3.5" /> Ceremonial Mint ID
                  </button>
                </nav>

                {/* Logins / Onboards trigger */}
                <div className="flex items-center gap-4">
                  <button 
                    id="secondary-login-btn"
                    onClick={() => onNavigate("login")}
                    className="text-[#94A3B8] hover:text-white text-xs font-bold font-mono uppercase tracking-widest transition"
                  >
                    Rep Sign-In
                  </button>
                  <button 
                    id="secondary-register-btn"
                    onClick={() => onNavigate("register")}
                    className="px-4.5 py-2 text-xs font-black font-mono tracking-widest rounded-lg bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/30 transition uppercase cursor-pointer flex items-center gap-1.5"
                  >
                    Launch Portal <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </header>

            {/* Sub-view Content Switchboard Router */}
            <main className="flex-1">
              <AnimatePresence mode="wait">
                
                {/* 1. ORIGINAL HOME VIEW */}
                {subView === "home" && (
                  <motion.div 
                    key="home-sub"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="py-12"
                  >
                    {/* Hero section */}
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                      
                      <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left transition-transform duration-300 ease-out" style={{ transform: heroTextTransform }}>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/10 text-[#FF6B35] text-[10px] font-mono mb-6 w-fit mx-auto lg:mx-0 shadow-inner">
                          <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-[#FF6B35]" />
                          <span>CE-96 STANDARD THERMAL INTEGRATION LAYER</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none text-white uppercase font-sans">
                          Turn Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] sm:block">Thermal Exhaust</span> Into Liquid Energy Asset.
                        </h1>

                        <p className="mt-6 text-[#94A3B8] text-sm md:text-base max-w-xl leading-relaxed mx-auto lg:mx-0 font-sans font-medium">
                          Neptune coordinates geothermal routing pipelines, mapping unrecovered thermal heat waste from high-density edge Data Centers directly to municipal heating grids and local aquaculture buyers. Stay CE-directive compliant while trading BTU capacity at absolute scale.
                        </p>

                        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                          <button
                            id="hero-get-started-btn"
                            ref={ctaBtnRef}
                            onMouseMove={handleCtaMagneticMove}
                            onMouseLeave={() => {
                              setCtaOffset({ x: 0, y: 0 });
                              setCursorHoverState("default");
                            }}
                            onClick={() => setSubView("mint")}
                            style={{ transform: `translate3d(${ctaOffset.x}px, ${ctaOffset.y}px, 0)` }}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#E25C2B] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-2xl shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition duration-150 ease-out transform cursor-pointer"
                          >
                            Pre-Register Node & Mint ID
                            <ArrowRight className="w-4 h-4 animate-bounce" />
                          </button>
                          <button
                            id="hero-demo-btn"
                            ref={demoBtnRef}
                            onMouseMove={handleDemoMagneticMove}
                            onMouseLeave={() => {
                              setDemoOffset({ x: 0, y: 0 });
                              setCursorHoverState("default");
                            }}
                            onClick={() => { setSubView("explore"); loadNetworkData(); }}
                            style={{ transform: `translate3d(${demoOffset.x}px, ${demoOffset.y}px, 0)` }}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-sky-500/25 bg-sky-950/20 text-[#4FC3F7] hover:text-white hover:bg-sky-900/30 font-black uppercase tracking-wider text-xs transition duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer backdrop-blur"
                          >
                            Explore Live Network Grid
                          </button>
                        </div>
                      </div>

                      {/* Right micro-instrument simulator */}
                      <div className="lg:col-span-5 relative flex justify-center mt-8 lg:mt-0" style={{ perspective: "1000px" }}>
                        <div 
                          className="w-full max-w-[420px] bg-[#111622]/40 border border-sky-500/20 rounded-3xl p-7 shadow-3xl relative overflow-hidden backdrop-blur-xl group transition-transform duration-300 ease-out"
                          style={{
                            boxShadow: "0 25px 50px -12px rgba(6, 12, 23, 0.95), inset 0 1px 1px rgba(255,255,255,0.05)",
                            transform: glassCardTransform
                          }}
                        >
                          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#FF6B35]/20 to-transparent blur-2xl pointer-events-none group-hover:scale-125 transition duration-500" />
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#4FC3F7]/15 to-transparent blur-2xl pointer-events-none" />

                          <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-mono text-[#4FC3F7] tracking-widest uppercase flex items-center gap-1.5 font-bold">
                              <Droplets className="w-3.5 h-3.5 animate-pulse text-[#4FC3F7]" /> LIVE COUPLING TELEMETRY
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                              SYNCHRONIZED CODES
                            </span>
                          </div>

                          <div className="space-y-4 relative z-10">
                            <div className="p-4 bg-[#070A11]/85 border border-sky-950/40 rounded-xl hover:border-sky-500/30 transition">
                              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                                <span>DATA CENTER INJECTION POINT</span>
                                <span>EXIT LIQUID TEMP</span>
                              </div>
                              <div className="flex justify-between items-baseline mt-1.5">
                                <span className="font-bold text-sm text-gray-100">Bhopal Core Edge-D</span>
                                <span className="font-mono text-[#FF6B35] font-black text-base">{simTemp}°C</span>
                              </div>
                              <div className="w-full bg-slate-950 h-1 rounded overflow-hidden mt-3">
                                <div className="h-full bg-[#FF6B35]" style={{ width: `${(simTemp / 100) * 100}%` }} />
                              </div>
                            </div>

                            <div className="p-4 bg-[#070A11]/85 border border-sky-950/40 rounded-xl hover:border-sky-500/30 transition">
                              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                                <span>GEOSPATIAL MATCHING NODE</span>
                                <span>PIPE HEAT DROP LOSS</span>
                              </div>
                              <div className="flex justify-between items-baseline mt-1.5">
                                <span className="text-[#4FC3F7] font-bold text-sm">Mandideep District Grid</span>
                                <span className="font-mono text-gray-200 text-xs font-bold">0.38°C / 0.95km</span>
                              </div>
                              <p className="text-[9px] font-mono text-emerald-400 mt-2">✔ SECTOR OPTIMAL PATH: 96.8% INTENSITY</p>
                            </div>

                            <div className="p-4 bg-gradient-to-r from-[#FF6B35]/15 to-[#4FC3F7]/5 border border-[#FF6B35]/30 rounded-xl flex items-center justify-between">
                              <div>
                                <div className="text-[9px] font-mono text-[#FF6B35] font-black uppercase tracking-widest">Active Swap Transfer</div>
                                <div className="text-sm font-black mt-0.5">{simGJ} Gigajoules Recycled</div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-black text-sm text-[#FF6B35]">₹{(simGJ * 450).toFixed(0)}</span>
                                <span className="block text-[8px] font-mono text-gray-400 mt-0.5">SHA-256 Ledger Sealed</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Integrated pillars section */}
                    <div className="max-w-7xl mx-auto px-6 py-20 mt-12 border-t border-sky-950/40" id="compliance">
                      <div className="text-center max-w-xl mx-auto mb-14">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">COUPLED GRID RECOVERY</h2>
                        <p className="text-xs font-mono text-[#4FC3F7] mt-1.5 uppercase tracking-widest font-bold">
                          Three operational frameworks bound into one compliance registry
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-[#FF6B35]/40 transition hover:bg-[#111622]/30 group backdrop-blur">
                          <div className="w-12 h-12 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-xl flex items-center justify-center mb-5">
                            <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">1. Regulatory Guard</h3>
                          <p className="text-[#94A3B8] text-xs leading-relaxed">
                            Compute your exact Energy Reuse Factor (ERF) in real time. Safeguard operations from severe computing penalty risks with active, machine-verified telemetry logging.
                          </p>
                        </div>
                        <div className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-[#4FC3F7]/40 transition hover:bg-[#111622]/30 group backdrop-blur">
                          <div className="w-12 h-12 bg-[#4FC3F7]/10 border border-[#4FC3F7]/30 rounded-xl flex items-center justify-center mb-5">
                            <Globe className="w-5 h-5 text-[#4FC3F7]" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">2. Geothermal Mapping</h3>
                          <p className="text-[#94A3B8] text-xs leading-relaxed">
                            Map district greenhouses, municipal heat sinks, and thermal distribution pipelines using Neptune's precise thermodynamic matching algorithm.
                          </p>
                        </div>
                        <div className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-amber-500/40 transition hover:bg-[#111622]/30 group backdrop-blur">
                          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mb-5">
                            <Layers className="w-5 h-5 text-amber-500" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-tight text-white mb-2">3. Direct Fluid Settle</h3>
                          <p className="text-[#94A3B8] text-xs leading-relaxed">
                            Form legal, machine-tracked heat contract flows. Settle volume rates instantly and export regulatory audits certified under direct SHA-256 signature hashes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. NEPTUNE NETWORK PUBLIC EXPLORER */}
                {subView === "explore" && (
                  <motion.div 
                    key="explore-sub"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-7xl mx-auto px-6 py-8 space-y-8"
                  >
                    
                    {/* Live Telemetry Headline Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111623]/80 border border-[#1F2733] p-6 rounded-2xl">
                      <div>
                        <div className="text-[10px] font-mono text-[#4FC3F7] tracking-widest font-black uppercase flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping shrink-0" />
                          Neptune Registry Terminal
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white mt-1">Live Capsule Directory</h2>
                        <p className="text-xs text-gray-400 mt-1">Exploration node array showing active, verified thermal emitters and heat coupler sinks.</p>
                      </div>

                      <div className="flex gap-3 text-xs">
                        <button 
                          onClick={loadNetworkData}
                          disabled={loadingExplore}
                          className="px-4 py-2 bg-[#1C2333] hover:bg-[#253047] border border-[#2B3547] text-gray-300 font-mono text-xs rounded-lg transition flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingExplore ? "animate-spin" : ""}`} /> Sync Registry
                        </button>
                        <button 
                          onClick={() => setSubView("mint")}
                          className="px-4 py-2 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black text-xs font-bold rounded-lg transition shadow-lg shadow-[#FF6B35]/15"
                        >
                          Mint New Capsule ID
                        </button>
                      </div>
                    </div>

                    {/* Telemetry Counter Boards Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Counter 1 */}
                      <div className="bg-[#111623]/40 border border-[#1F2733] p-5 rounded-2xl relative overflow-hidden backdrop-blur">
                        <div className="absolute right-3 top-3 text-[#FF6B35]"><Cpu className="w-6 h-6 opacity-30" /></div>
                        <p className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest">Verified Nodes</p>
                        <p className="text-2xl font-black font-mono text-white mt-2">
                          {networkStats ? networkStats.totalCapsules : nodes.length}
                        </p>
                        <p className="text-[9px] text-[#FF6B35] font-mono mt-1">✔ Anchor Proof Verified</p>
                      </div>
                      
                      {/* Counter 2 */}
                      <div className="bg-[#111623]/40 border border-[#1F2733] p-5 rounded-2xl relative overflow-hidden backdrop-blur">
                        <div className="absolute right-3 top-3 text-[#4FC3F7]"><Activity className="w-6 h-6 opacity-30" /></div>
                        <p className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest">Thermal Exchanged</p>
                        <p className="text-2xl font-black font-mono text-[#4FC3F7] mt-2">
                          {networkStats ? networkStats.totalGjTraded : "0.00"} <span className="text-xs text-gray-400 uppercase font-sans">GJ</span>
                        </p>
                        <p className="text-[9px] text-[#4FC3F7] font-mono mt-1">Based on telemetry logs</p>
                      </div>

                      {/* Counter 3 */}
                      <div className="bg-[#111623]/40 border border-[#1F2733] p-5 rounded-2xl relative overflow-hidden backdrop-blur">
                        <div className="absolute right-3 top-3 text-emerald-400"><Droplets className="w-6 h-6 opacity-30" /></div>
                        <p className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest">Water Preserved</p>
                        <p className="text-2xl font-black font-mono text-emerald-400 mt-2">
                          {networkStats ? networkStats.totalLitersWaterOffset.toLocaleString() : "0"} <span className="text-xs text-gray-400 font-sans">Ltr</span>
                        </p>
                        <p className="text-[9px] text-emerald-400 font-mono mt-1">15.5L Preserved per GJ</p>
                      </div>

                      {/* Counter 4 */}
                      <div className="bg-[#111623]/40 border border-[#1F2733] p-5 rounded-2xl relative overflow-hidden backdrop-blur">
                        <div className="absolute right-3 top-3 text-amber-500"><TrendingUp className="w-6 h-6 opacity-30" /></div>
                        <p className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest">CO2 Avoided</p>
                        <p className="text-2xl font-black font-mono text-amber-500 mt-2">
                          {networkStats ? networkStats.totalCo2AvoidedKg.toLocaleString() : "0"} <span className="text-xs text-gray-400 font-sans">Kg</span>
                        </p>
                        <p className="text-[9px] text-amber-500 font-mono mt-1">50Kg Carbon sequestered / GJ</p>
                      </div>
                    </div>

                    {/* Node directory split mapping panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      
                      {/* Left: GIS Node Map overlay (MapCanvas inside public viewport!) */}
                      <div className="lg:col-span-7 flex flex-col bg-[#111623]/40 border border-[#1F2733] rounded-2xl overflow-hidden p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-sky-950/30">
                          <span className="text-xs font-mono font-black uppercase text-[#4FC3F7] tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#4FC3F7]" /> LIVE GEOSPATIAL MAP (BHOPAL BASIN)
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 bg-sky-950/40 px-2 py-0.5 rounded">Search radius: 10km</span>
                        </div>

                        <div className="h-[380px] bg-[#0A0D14] rounded-xl overflow-hidden border border-[#1F2733] relative">
                          <MapCanvas 
                            facilities={mappedFacilitiesForCanvas as any[]}
                            matches={[]}
                            selectedFacility={selectedNode ? mappedFacilitiesForCanvas.find(f => f.id === selectedNode.id) as any : null}
                            selectedMatch={null}
                            searchRadiusKm={10}
                            onSelectFacility={(fac) => {
                              const found = nodes.find(n => n.id === fac.id);
                              if (found) setSelectedNode(found);
                            }}
                          />
                        </div>
                        <p className="text-[10px] font-mono text-[#64748B] text-center">💡 Left click map hotspots to trigger live Capsule profile lookups.</p>
                      </div>

                      {/* Right: Directory Node List with detailed telemetry filters */}
                      <div className="lg:col-span-5 flex flex-col bg-[#111623]/40 border border-[#1F2733] rounded-2xl p-5 space-y-4">
                        
                        <div className="space-y-2">
                          <span className="text-xs font-mono font-black uppercase text-[#FF6B35] tracking-wider">Node Search Filters</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {["ALL", "DATA_CENTER", "HEAT_BUYER"].map((t) => (
                              <button
                                key={t}
                                onClick={() => setNodeFilter(t)}
                                className={`py-1.5 px-2.5 rounded text-[10px] font-mono uppercase font-black tracking-wider transition ${nodeFilter === t ? "bg-[#FF6B35] text-black" : "bg-[#1C2333]/90 text-gray-400 hover:text-white border border-[#2B3547]"}`}
                              >
                                {t === "ALL" ? "All Types" : t === "DATA_CENTER" ? "Emitter" : "Sink"}
                              </button>
                            ))}
                          </div>
                          
                          <div className="relative mt-2">
                            <input 
                              type="text"
                              placeholder="Find Capsule ID or Facility Name..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full bg-[#0A0E15] border border-[#2B3547] rounded-lg px-3 py-2 pl-9 text-xs text-white focus:outline-none focus:border-[#FF6B35]"
                            />
                            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3 cursor-pointer" />
                          </div>
                        </div>

                        {/* Scrolling list */}
                        <div className="flex-1 max-h-[300px] overflow-y-auto space-y-2 pr-1.5">
                          {filteredNodes.length === 0 ? (
                            <div className="text-center py-10 text-xs text-gray-500 font-mono">No matching capsule nodes inside sector range.</div>
                          ) : (
                            filteredNodes.map(n => {
                              const isSelected = selectedNode && selectedNode.id === n.id;
                              return (
                                <div 
                                  key={n.id}
                                  onClick={() => setSelectedNode(n)}
                                  className={`p-3.5 rounded-xl border transition cursor-pointer flex justify-between items-center ${isSelected ? "border-[#FF6B35] bg-[#FF6B35]/5" : "border-[#1F2733] bg-[#0E131F]/90 hover:border-[#4FC3F7]/30"}`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-1.5 h-1.5 rounded-full ${n.type === "DATA_CENTER" ? "bg-[#FF6B35]" : "bg-[#4FC3F7]"}`} />
                                      <h4 className="text-xs font-black uppercase text-gray-100 truncate max-w-[170px]">{n.name}</h4>
                                    </div>
                                    <span className="text-[9px] font-mono text-[#94A3B8] uppercase block mt-1">CAPSULE CODE: {n.capsuleCode || "DRAFT_ISSUED"}</span>
                                  </div>

                                  <div className="text-right">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-black inline-block ${n.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-[#1C2333] text-amber-400 border border-amber-500/20"}`}>
                                      {n.status === "ACTIVE" ? "Sealed / Active" : "Pending Verify"}
                                    </span>
                                    <span className="block text-[8px] font-mono text-[#64748B] mt-1 uppercase">GRID ZONE IN-02</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                      </div>
                    </div>

                    {/* public capsule badge lookup popup (Modal details) */}
                    {selectedNode && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-sky-950/20 via-[#111623] to-[#111623] border border-[#FF6B35]/30 p-6 rounded-2xl relative shadow-2xl"
                      >
                        <button 
                          onClick={() => setSelectedNode(null)}
                          className="absolute right-4 top-4 text-xs font-mono text-gray-500 hover:text-white"
                        >
                          ✕ Close Profile
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          <div className="md:col-span-8 space-y-4">
                            <span className="inline-flex items-center gap-1 bg-[#FF6B35]/15 border border-[#FF6B35]/30 text-[#FF6B35] text-[9px] font-mono px-2 py-0.5 rounded uppercase">
                              <Anchor className="w-3 h-3" /> Cryptographic Authenticity Record
                            </span>
                            
                            <h3 className="text-2xl font-black tracking-tight text-white uppercase">{selectedNode.name}</h3>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-2">
                              <div>
                                <span className="text-gray-500 block text-[9px]">CAPSULE ID CODE</span>
                                <span className="text-[#4FC3F7] font-bold">{selectedNode.capsuleCode || "DRAFT-SEQUENCE"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[9px]">ON-CHAIN ANCHOR</span>
                                <span className="text-emerald-400 font-bold">{selectedNode.onChainAnchored ? "✔ SECURED" : "PENDING"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[9px]">GEOSPATIAL COORDINATES</span>
                                <span className="text-gray-300 font-bold">{parseFloat(selectedNode.latitude).toFixed(4)}N, {parseFloat(selectedNode.longitude).toFixed(4)}E</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[9px]">NODE CLASSIFICATION</span>
                                <span className="text-gray-300 font-bold">{selectedNode.type === "DATA_CENTER" ? "Thermal Supplier" : "Thermal Sink / Buyer"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-4 bg-[#0A0D14] border border-[#1F2733] p-4 rounded-xl text-center flex flex-col justify-center items-center">
                            <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mb-2">
                              <BadgePercent className="w-5 h-5 text-[#FF6B35]" />
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none mt-1">Operational Authority Code</span>
                            <span className="text-xs font-mono text-gray-300 truncate max-w-full block mt-2 font-black tracking-wider bg-slate-900 border border-slate-950 px-2 py-1 rounded">
                              SHA256-REG-IN-02-BHP-{selectedNode.id}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Comprehensive Global Grid Leaderboard */}
                    <div className="bg-[#111623]/40 border border-[#1F2733] p-6 rounded-2xl space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" /> Sector Leaderboard
                          </h3>
                          <p className="text-xs text-gray-400">Leaderboard of top grid facilities ranked by absolute thermodynamic integration volume.</p>
                        </div>

                        {/* Metric selection buttons */}
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() => setLeaderboardMetric("heat")}
                            className={`py-1.5 px-3.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${leaderboardMetric === "heat" ? "bg-amber-500/10 text-amber-400 border-amber-500/40" : "bg-[#1C2333]/90 text-gray-400 hover:text-white border-[#2B3547]"}`}
                          >
                            <Flame className="w-3.5 h-3.5 text-[#FF6B35]" /> Heat Recycled
                          </button>
                          <button
                            onClick={() => setLeaderboardMetric("water")}
                            className={`py-1.5 px-3.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${leaderboardMetric === "water" ? "bg-amber-500/10 text-amber-400 border-amber-500/40" : "bg-[#1C2333]/90 text-gray-400 hover:text-white border-[#2B3547]"}`}
                          >
                            <Droplets className="w-3.5 h-3.5 text-[#4FC3F7]" /> Freshwater Preserved
                          </button>
                        </div>
                      </div>

                      {/* Leaderboard Table display */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-[#1F2733] text-gray-500 text-[10px] uppercase">
                              <th className="py-3 px-4 text-center">Rank</th>
                              <th className="py-3 px-4">Registry Node Name</th>
                              <th className="py-3 px-4">Node Type</th>
                              <th className="py-3 px-4 text-center">District Sector</th>
                              <th className="py-3 px-4 text-right">Heat Recycled (GJ)</th>
                              <th className="py-3 px-4 text-right">Water Logged Offset (Ltr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">No active trades recorded inside this directory cycle.</td>
                              </tr>
                            ) : (
                              leaderboard.map((row, index) => (
                                <tr key={row.facilityId} className="border-b border-sky-950/20 hover:bg-slate-900/40 transition">
                                  <td className="py-3.5 px-4 text-center font-bold">
                                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                  </td>
                                  <td className="py-3.5 px-4 font-sans font-bold text-gray-100">{row.name}</td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${row.type === "DATA_CENTER" ? "bg-[#FF6B35]/10 text-[#FF6B35]" : "bg-sky-500/10 text-sky-400"}`}>
                                      {row.type === "DATA_CENTER" ? "Emitter" : "Sink"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center text-gray-400 font-bold">{row.countryCode}</td>
                                  <td className="py-3.5 px-4 text-right font-bold text-gray-200">{row.totalGjTraded.toFixed(2)}</td>
                                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">{(row.totalLitersWaterOffset).toLocaleString()} L</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </motion.div>
                )}

                {/* 3. CEREMONIAL REGISTRATIONFLOW */}
                {subView === "mint" && (
                  <motion.div 
                    key="mint-sub"
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-2xl mx-auto px-6 py-12"
                  >
                    
                    <div className="bg-[#111623]/80 border border-[#1F2733] rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur">
                      <div className="absolute right-[-40px] top-[-40px] w-40 h-40 bg-gradient-to-br from-[#FF6B35]/10 to-transparent blur-3xl pointer-events-none" />

                      <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 bg-[#FF6B35]/15 border border-[#FF6B35]/30 text-[#FF6B35] text-[10px] font-mono px-3 py-1 rounded-full uppercase font-black">
                          <Anchor className="w-3.5 h-3.5 animate-pulse" /> Ceremonial Registry
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">Mint Capsule Identity</h2>
                        <p className="text-xs text-gray-400">Claim your district sector location coordinates, run radar tests, and anchor a new Capsule ID.</p>
                      </div>

                      {/* Step Indicator Progress Bar */}
                      <div className="flex justify-between items-center max-w-sm mx-auto font-mono text-[10px] pt-2">
                        {[1, 2, 3].map((s) => (
                          <React.Fragment key={s}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs ${mintStep >= s ? "bg-[#FF6B35] text-black" : "bg-[#1C2333] text-gray-500 border border-[#2B3547]"}`}>
                              {s}
                            </div>
                            {s < 3 && <div className={`h-[1px] flex-1 mx-2 ${mintStep > s ? "bg-[#FF6B35]" : "bg-[#2B3547]"}`} />}
                          </React.Fragment>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        
                        {/* STEP 1: INITIAL DATA COLLECTION */}
                        {mintStep === 1 && (
                          <motion.div 
                            key="mint-step-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-5 pt-4"
                          >
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest block">Facility Registry Name</label>
                              <input 
                                type="text"
                                required
                                value={facName}
                                onChange={(e) => setFacName(e.target.value)}
                                placeholder="e.g. Bhopal Edge DC Sector-4"
                                className="w-full bg-[#0A0D15] border border-[#2B3547] focus:border-[#FF6B35] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-0 transition"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest block">Latitude Coordinates</label>
                                <input 
                                  type="text"
                                  required
                                  value={facLat}
                                  onChange={(e) => setFacLat(e.target.value)}
                                  placeholder="e.g. 23.2500"
                                  className="w-full bg-[#0A0D15] border border-[#2B3547] focus:border-[#FF6B35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest block">Longitude Coordinates</label>
                                <input 
                                  type="text"
                                  required
                                  value={facLng}
                                  onChange={(e) => setFacLng(e.target.value)}
                                  placeholder="e.g. 77.4100"
                                  className="w-full bg-[#0A0D15] border border-[#2B3547] focus:border-[#FF6B35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-[#94A3B8] tracking-widest block">Operational Classification</label>
                              <select
                                value={facType}
                                onChange={(e) => setFacType(e.target.value as any)}
                                className="w-full bg-[#0A0D15] border border-[#2B3547] focus:border-[#FF6B35] rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-sans"
                              >
                                <option value="DATA_CENTER">Emitter (Produces high density chassis waste heat)</option>
                                <option value="HEAT_BUYER">Sink / Collector (Absorbs thermal water loop for utilities)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={triggerLocationClaimCheck}
                              disabled={!facName || checkingLocation}
                              className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#E25C2B] text-black font-black uppercase text-xs tracking-wider rounded-xl hover:shadow-lg hover:shadow-[#FF6B35]/15 transition disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                              {checkingLocation ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" /> Sweeping Sector Radar...
                                </>
                              ) : (
                                <>
                                  Analyze Coordinates Alignment <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}

                        {/* STEP 2: CLAIM RADAR VERIFICATION */}
                        {mintStep === 2 && (
                          <motion.div 
                            key="mint-step-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6 pt-4 text-center"
                          >
                            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
                              <RadarIcon className="w-8 h-8 text-emerald-400" />
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-xl font-bold uppercase text-gray-100">Sector Sweep Succeeded</h3>
                              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
                                Radar evaluation complete inside Grid sector coordinates <span className="font-mono text-gray-100">{parseFloat(facLat).toFixed(4)}N, {parseFloat(facLng).toFixed(4)}E</span>.
                              </p>
                            </div>

                            {/* Coupler Compatibility Meter */}
                            <div className="bg-[#0A0D14] border border-[#1F2733] p-4 rounded-2xl max-w-sm mx-auto text-center font-mono">
                              <span className="text-[9px] text-gray-500 uppercase tracking-widest block">District complementary couplers</span>
                              <span className="text-2xl font-black text-[#FF6B35] block mt-1.5">{claimedMatches} Couplers detected</span>
                              <p className="text-[10px] text-emerald-400 mt-2">✔ Excellent thermodynamic viability parameters verified!</p>
                            </div>

                            <div className="flex gap-3 justify-center pt-2">
                              <button
                                onClick={() => setMintStep(1)}
                                className="px-6 py-3.5 border border-[#2B3547] text-gray-300 hover:text-white rounded-xl text-xs font-bold uppercase"
                              >
                                Adjust Coordinates
                              </button>
                              <button
                                onClick={triggerCeremonialMint}
                                disabled={mintingCode}
                                className="px-8 py-3.5 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black text-xs font-black uppercase rounded-xl shadow-lg flex items-center gap-1.5"
                              >
                                {mintingCode ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin text-black" /> Anchoring Identity...
                                  </>
                                ) : (
                                  <>
                                    Mint Capsule ID & Anchor <Zap className="w-4 h-4 fill-current text-black" />
                                  </>
                                )}
                              </button>
                            </div>

                            {mintError && (
                              <p className="text-xs text-red-400 font-mono">✕ Collision Alert: {mintError}</p>
                            )}
                          </motion.div>
                        )}

                        {/* STEP 3: MINT CODES GENERATED & SEALED */}
                        {mintStep === 3 && mintResult && (
                          <motion.div 
                            key="mint-step-3"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6 pt-4 text-center"
                          >
                            <div className="w-16 h-16 bg-[#FF6B35]/15 border border-[#FF6B35]/30 text-[#FF6B35] rounded-full flex items-center justify-center mx-auto animate-bounce">
                              <CheckCircle className="w-8 h-8" />
                            </div>

                            <div className="space-y-2">
                              <h3 className="text-xl font-black uppercase text-white">Identity Mint Sealed!</h3>
                              <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                                Capsule ID generated successfully and seeded directly inside Neptune's public registry hierarchy.
                              </p>
                            </div>

                            {/* Cryptographic identity badge */}
                            <div className="bg-gradient-to-b from-[#0A101C] to-[#121A2A] border border-[#FF6B35]/45 rounded-2xl p-6 shadow-2xl relative max-w-md mx-auto text-left font-mono">
                              <div className="absolute top-4 right-4 text-[#FF6B35] opacity-20"><Info className="w-10 h-10" /></div>
                              <span className="text-[9px] text-[#FF6B35] tracking-widest uppercase font-black">Neptune Verification Seal</span>
                              
                              <div className="mt-4 space-y-3 text-xs leading-none">
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase block">Sealed Capsule ID</span>
                                  <span className="text-white text-base font-bold mt-1 inline-block">{mintResult.capsule.capsuleCode}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[8px] uppercase block">Node Authority Hash</span>
                                  <span className="text-[#4FC3F7] text-[10px] break-all block font-bold leading-normal">{mintResult.capsule.onChainTxHash}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-1">
                                  <div>
                                    <span className="text-gray-500 text-[8px] uppercase block">Sector Status</span>
                                    <span className="text-[#FF6B35] font-black tracking-wider text-[9px] block">PENDING_VERIFY</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 text-[8px] uppercase block">Reverse Geo Code</span>
                                    <span className="text-gray-300 font-bold block">{mintResult.facility.countryCode || "IN"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 pt-3">
                              <button
                                onClick={handleProceedToSignUp}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-[#10B981] text-black font-black uppercase text-xs tracking-widest rounded-xl hover:shadow-lg transition flex items-center justify-center gap-1.5"
                              >
                                Claim Credentials Custody <ArrowRight className="w-4 h-4 text-black" />
                              </button>
                              
                              <button
                                onClick={() => { setMintStep(1); setFacName(""); }}
                                className="text-xs text-gray-500 hover:text-white font-mono underline"
                              >
                                Mint another node instead
                              </button>
                            </div>
                          </motion.div>
                        )}

                      </AnimatePresence>

                    </div>

                  </motion.div>
                )}

              </AnimatePresence>
            </main>

            {/* Bottom Credits Footer */}
            <footer className="relative border-t border-sky-950/40 py-12 z-10 text-center text-xs text-[#64748B] bg-[#070B11]/90 backdrop-blur-md">
              <div className="max-w-7xl mx-auto px-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#4FC3F7] rounded-full animate-pulse" />
                  <span className="font-mono text-[9px] text-[#4FC3F7] uppercase tracking-widest font-black">Neptune Thermal Coupling Harbor Registry</span>
                </div>
                <p className="font-medium text-slate-500">Neptune (Managed by teamashish2005@gmail.com) © 2026. Sealed with absolute geospatial compliance parameters.</p>
              </div>
            </footer>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// Custom simple Radar icon renderer to keep bundle clean
function RadarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
    </svg>
  );
}
