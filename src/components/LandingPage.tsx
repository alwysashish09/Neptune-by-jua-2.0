import React, { useState, useEffect, useRef } from "react";
import { 
  Flame, ShieldCheck, ArrowRight, Zap, RefreshCw, Layers, Globe, 
  Droplets, Sparkles, AlertCircle, Ship, Waves, Eye, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingPageProps {
  onNavigate: (view: string) => void;
}

// Coordinate & speed properties for physics particles on canvas
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
  // Phase sequence: 'loading' -> 'ready_to_dive' -> 'diving' -> 'splash' -> 'reveal_active'
  const [phase, setPhase] = useState<"loading" | "ready_to_dive" | "diving" | "splash" | "reveal_active">("loading");
  const [loadPercent, setLoadPercent] = useState<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorBg, setCursorBg] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<Bubble[]>([]);

  // Simulation values for the micro-app card
  const [simTemp, setSimTemp] = useState(65.4);
  const [simGJ, setSimGJ] = useState(158.2);

  // Customized Interactive Cursor with Micro-Interaction states
  const [cursorHoverState, setCursorHoverState] = useState<"default" | "cta" | "card" | "brand">("default");

  // Magnetic custom CTA button refs and displacement state
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
    const pullX = (e.clientX - elemX) * 0.35;
    const pullY = (e.clientY - elemY) * 0.35;
    setCtaOffset({ x: pullX, y: pullY });
    setCursorHoverState("cta");
  };

  const handleDemoMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!demoBtnRef.current) return;
    const rect = demoBtnRef.current.getBoundingClientRect();
    const elemX = rect.left + rect.width / 2;
    const elemY = rect.top + rect.height / 2;
    const pullX = (e.clientX - elemX) * 0.28;
    const pullY = (e.clientY - elemY) * 0.28;
    setDemoOffset({ x: pullX, y: pullY });
    setCursorHoverState("cta");
  };

  const handleBrandMagneticMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!brandLogoRef.current) return;
    const rect = brandLogoRef.current.getBoundingClientRect();
    const elemX = rect.left + rect.width / 2;
    const elemY = rect.top + rect.height / 2;
    const pullX = (e.clientX - elemX) * 0.25;
    const pullY = (e.clientY - elemY) * 0.25;
    setBrandOffset({ x: pullX, y: pullY });
    setCursorHoverState("brand");
  };

  // Normalized relative offset positions for interactive Parallax layer motions
  const [windowSize, setWindowSize] = useState({ w: 1200, h: 800 });

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

  // Compute normalized coordinate shifts: -10px to +10px for elements
  const normX = (mousePos.x / (windowSize.w || 1200)) - 0.5;
  const normY = (mousePos.y / (windowSize.h || 800)) - 0.5;

  const bgTextTransform = `translate3d(${normX * -35}px, ${normY * -35}px, 0)`;
  const heroTextTransform = `translate3d(${normX * -12}px, ${normY * -12}px, 0)`;
  const glassCardTransform = `translate3d(${normX * 25}px, ${normY * 25}px, 0) rotateY(${normX * 8}deg) rotateX(${normY * -8}deg)`;

  // Slow-loading preloader simulation
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase("ready_to_dive"), 650);
          return 100;
        }
        // Realistic step speed increase/decrease
        const step = Math.floor(Math.random() * 8) + 4;
        return Math.min(100, prev + step);
      });
    }, 90);
    return () => clearInterval(interval);
  }, [phase]);

  // Micro-data live simulator increments
  useEffect(() => {
    if (phase !== "reveal_active") return;
    const interval = setInterval(() => {
      setSimTemp((t) => +(t + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setSimGJ((g) => +(g + Math.random() * 0.1).toFixed(2));
    }, 2000);
    return () => clearInterval(interval);
  }, [phase]);

  // Cursor position tracking for magnetic/parallex effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      setMousePos({ x: clientX, y: clientY });
      // Lazy tracking for ambient orb lighting
      setTimeout(() => {
        setCursorBg({ x: clientX, y: clientY });
      }, 80);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // HTML5 Canvas Fluid / Bubbles & Floating Caustics Renderer
  useEffect(() => {
    if (phase !== "reveal_active" && phase !== "diving") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Bootstrap physical bubble system
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

      // 1. Draw water abyss gradient (shimmers based on phase/depth)
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#061322");
      gradient.addColorStop(0.5, "#030A14");
      gradient.addColorStop(1, "#010408");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Liquid Light Caustics shimmer simulation
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
        rayGradient.addColorStop(0, `rgba(79, 195, 247, ${0.12 - j * 0.03})`);
        rayGradient.addColorStop(0.4, `rgba(255, 107, 53, ${0.03 - j * 0.01})`);
        rayGradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rayGradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();

      // 3. Fluid caustics waves at the bottom
      ctx.strokeStyle = "rgba(79, 195, 247, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 15) {
        const y = height - 120 + Math.sin(x * 0.005 + renderTime) * 15 + Math.cos(x * 0.01 - renderTime * 0.5) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 4. Physical Bubble Loop with interactive cursor displacement field
      bubbles.forEach((b) => {
        b.y -= b.speedY;
        b.wobble += b.wobbleSpeed;
        const driftX = Math.sin(b.wobble) * 0.8;
        b.x += driftX;

        // Reset if bubble drifts past the top of the browser screen
        if (b.y < -30) {
          b.y = height + Math.random() * 40;
          b.x = Math.random() * width;
        }

        // Mouse displacement calculation (Push physics!)
        const dx = b.x - mousePos.x;
        const dy = b.y - mousePos.y;
        const dist = Math.hypot(dx, dy);
        const effectRadius = 140;

        if (dist < effectRadius) {
          const force = (effectRadius - dist) / effectRadius;
          const pushX = (dx / dist) * force * 5;
          const pushY = (dy / dist) * force * 5;
          b.x += pushX;
          b.y += pushY;
        }

        // Render glossy glass bubble specular effect
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

        // High gloss highlight
        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [phase, mousePos]);

  // Initiate the cinematic dive sequences
  const startPlunge = () => {
    setPhase("diving");
    // State 1: Sky fall acceleration duration
    setTimeout(() => {
      setPhase("splash");
      // State 2: Splash distortion climax
      setTimeout(() => {
        setPhase("reveal_active");
      }, 1100);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#070B11] text-white relative font-sans selection:bg-[#FF6B35] selection:text-black overflow-x-hidden">
      
      {/* HTML5 Dynamic Particle background - active after entry */}
      {(phase === "reveal_active" || phase === "diving" || phase === "splash") && (
        <canvas 
          ref={canvasRef} 
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
        />
      )}

      {/* Decorative radial lighting node mimicking depth illumination */}
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
        
        {/* ========================================== */}
        {/* PHASE 1: THERMAL INITIALIZER PRE-LOADER */}
        {/* ========================================== */}
        {phase === "loading" && (
          <motion.div 
            key="preloader"
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-[#090D15] flex flex-col items-center justify-center p-6 z-50 overflow-hidden"
          >
            {/* Grid background on preloader */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#131B27_1px,transparent_1px),linear-gradient(to_bottom,#131B27_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
            
            <div className="relative text-center max-w-md w-full space-y-8 z-10">
              <div className="inline-flex items-center gap-2 bg-[#FF6B35]/10 border border-[#FF6B35]/30 px-3.5 py-1.5 rounded-full">
                <Flame className="w-4 h-4 text-[#FF6B35] animate-bounce" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-[#FF6B35] font-black">Neptune Systems Localizing</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white font-sans">
                  THERMAL COUPLING
                </h2>
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  Initializing Liquid Energy Registry...
                </p>
              </div>

              {/* Glassmorphic progress tracker */}
              <div className="bg-[#111723]/80 border border-[#1F2733] backdrop-blur-xl p-4 rounded-2xl relative shadow-2xl">
                <div className="flex justify-between items-center text-[10px] font-mono mb-2 text-gray-400">
                  <span>SECURE MEMORY COUPLER</span>
                  <span className="text-[#FF6B35] font-bold">{loadPercent}%</span>
                </div>
                
                {/* Outter liquid bar path */}
                <div className="h-2.5 w-full bg-[#070A10] rounded-full overflow-hidden p-[1px] border border-[#1F2733]">
                  <motion.div 
                    className="h-full rounded-full bg-gradient-to-r from-[#FF6B35] via-[#E28743] to-[#4FC3F7] shadow-lg relative"
                    style={{ width: `${loadPercent}%` }}
                  >
                    {/* Glowing endpoint bubble */}
                    <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white blur-[2px] rounded-full" />
                  </motion.div>
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 mt-2">
                  <span>LOAD_MODULES: DRIZZLE_STORE</span>
                  <span>STATUS: HIGH_SPEED_LDAP</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* PHASE 2: TRIGGER DIVE BOARD */}
        {/* ========================================== */}
        {phase === "ready_to_dive" && (
          <motion.div 
            key="ready-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#06101D] flex flex-col items-center justify-center p-6 z-50 text-center"
          >
            {/* Cinematic background caustics preview */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#4FC3F7]/15 via-[#06101D]_70% to-[#01060C] pointer-events-none" />
            
            <div className="max-w-xl space-y-8 z-10">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#FF6B35] to-[#4FC3F7] p-[1.5px] mx-auto shadow-2xl"
              >
                <div className="w-full h-full rounded-[23px] bg-[#070C15] flex items-center justify-center">
                  <Flame className="w-9 h-9 text-[#FF6B35]" />
                </div>
              </motion.div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white font-sans">
                  NEPTUNE ENERGY
                </h1>
                <p className="text-sm md:text-base font-mono text-[#4FC3F7] uppercase tracking-widest font-semibold max-w-md mx-auto">
                  Regulatory Compliance & Wastewater Grid Routing Protocol
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Prepare for sensory dive calibration. You are descending through the high altitude clouds directly into Neptune's sub-surface compliance harbor.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startPlunge}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E9571E] text-black text-sm font-black uppercase tracking-widest shadow-2xl shadow-[#FF6B35]/30 cursor-pointer flex items-center justify-center gap-3 mx-auto"
              >
                <Waves className="w-5 h-5 animate-pulse" />
                Dive into Neptune
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* PHASE 3: MOUNT FALL CLIMAX RAMP */}
        {/* ========================================== */}
        {phase === "diving" && (
          <motion.div 
            key="dive-tunnel"
            className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-hidden"
            initial={{ backgroundColor: "#06101D" }}
            animate={{ backgroundColor: ["#06101D", "#FFFFFF", "#4FC3F7", "#061322"] }}
            transition={{ duration: 1.8, times: [0, 0.45, 0.7, 1] }}
          >
            {/* Cinematic abstract acceleration lines zooming past eye perspective */}
            <div className="absolute inset-0 mix-blend-overlay opacity-80 flex flex-col items-center justify-center">
              <motion.div 
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [1, 2.8, 5], opacity: [0, 1, 0] }}
                transition={{ duration: 1.7, repeat: Infinity, ease: "easeIn" }}
                className="w-full h-full border-[10vw] border-double border-white rounded-full flex items-center justify-center"
              />
              <motion.div 
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.8, 2.4, 4.2], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1.3, delay: 0.4, repeat: Infinity, ease: "easeIn" }}
                className="w-full h-full border-[6vw] border-dotted border-sky-200 rounded-full"
              />
            </div>

            <div className="absolute text-center text-white z-10 px-6">
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: [1, 1.4, 0.7], opacity: [0.5, 1, 0] }}
                transition={{ duration: 1.8 }}
                className="font-black tracking-tighter uppercase text-4xl md:text-7xl italic font-mono text-cyan-200"
              >
                FREEFALL...
              </motion.div>
              <p className="text-xs font-mono uppercase tracking-widest text-[#FF6B35] font-bold mt-2">Plunging into thermal sea</p>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* PHASE 4: THE OCEAN WATER SURFACE SPLASH */}
        {/* ========================================== */}
        {phase === "splash" && (
          <motion.div 
            key="heavy-splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 bg-[#0D253F] flex items-center justify-center z-50"
          >
            {/* Liquid ripple circular shockwave */}
            <motion.div 
              initial={{ scale: 0, opacity: 1, borderWidth: "80px" }}
              animate={{ scale: 5, opacity: 0, borderWidth: "1px" }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              className="absolute rounded-full border border-sky-400/90 w-[30vw] h-[30vw]"
            />
            {/* Second cascade shockwave */}
            <motion.div 
              initial={{ scale: 0.1, opacity: 0.9, borderWidth: "60px" }}
              animate={{ scale: 4.2, opacity: 0, borderWidth: "2px" }}
              transition={{ duration: 0.95, delay: 0.15, ease: "easeOut" }}
              className="absolute rounded-full border border-amber-500/80 w-[24vw] h-[24vw]"
            />

            <div className="text-center z-10 text-cyan-200">
              <Waves className="w-16 h-16 mx-auto animate-ping opacity-60 text-[#4FC3F7]" />
              <h1 className="text-2xl font-black font-mono mt-4 uppercase tracking-widest">** SPLASH **</h1>
              <p className="text-[10px] uppercase font-mono tracking-widest text-orange-400 mt-2">Abyssal thermal contact settled</p>
            </div>
          </motion.div>
        )}

        {/* ========================================== */}
        {/* PHASE 5: THE ACTIVE DEEP-SEA LANDING DECK */}
        {/* ========================================== */}
        {phase === "reveal_active" && (
          <motion.div 
            key="landing-page-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10 w-full min-h-screen lg:cursor-none"
          >
            {/* Custom Interactive Liquid Glass Cursor */}
            <motion.div
              className="fixed pointer-events-none z-50 rounded-full hidden lg:flex items-center justify-center border transition-all duration-75 overflow-hidden"
              style={{
                left: mousePos.x,
                top: mousePos.y,
                x: "-50%",
                y: "-50%",
              }}
              animate={{
                width: cursorHoverState === "cta" ? 88 : cursorHoverState === "card" ? 124 : cursorHoverState === "brand" ? 44 : 22,
                height: cursorHoverState === "cta" ? 88 : cursorHoverState === "card" ? 52 : cursorHoverState === "brand" ? 44 : 22,
                borderRadius: cursorHoverState === "card" ? "14px" : "9999px",
                backgroundColor: cursorHoverState === "cta" ? "rgba(255, 107, 53, 0.18)" : cursorHoverState === "card" ? "rgba(79, 195, 247, 0.12)" : "rgba(255, 255, 255, 0.15)",
                borderColor: cursorHoverState === "cta" ? "#FF6B35" : cursorHoverState === "card" ? "#4FC3F7" : "rgba(255, 255, 255, 0.4)",
                backdropFilter: "blur(6px)",
                boxShadow: cursorHoverState === "cta" ? "0 0 25px rgba(255, 107, 53, 0.5)" : cursorHoverState === "card" ? "0 0 30px rgba(79, 195, 247, 0.35)" : "0 5px 15px rgba(0,0,0,0.5)",
              }}
              transition={{ type: "spring", stiffness: 450, damping: 24 }}
            >
              <AnimatePresence mode="wait">
                {cursorHoverState === "cta" && (
                  <motion.div
                    key="cta-icon"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="text-white text-[9px] font-mono tracking-widest font-extrabold uppercase flex items-center gap-1"
                  >
                    DIVE <ArrowRight className="w-3.5 h-3.5 text-[#FF6B35] animate-pulse" />
                  </motion.div>
                )}
                {cursorHoverState === "card" && (
                  <motion.div
                    key="card-icon"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="text-[#4FC3F7] text-[9px] font-mono font-black tracking-widest uppercase flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#4FC3F7] animate-spin" style={{ animationDuration: '3s' }} /> FOCUS
                  </motion.div>
                )}
                {cursorHoverState === "brand" && (
                  <motion.div
                    key="brand-glow"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#FF6B35] to-[#4FC3F7] animate-ping"
                  />
                )}
              </AnimatePresence>

              {/* Liquid inner bubble specular dot when default */}
              {cursorHoverState === "default" && (
                <div className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse shadow-sm" />
              )}
            </motion.div>

            {/* Skeuomorphic Carved Text deeply embedded behind glass plates */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none z-0 overflow-hidden w-full hidden lg:block text-center uppercase transition-transform duration-300 ease-out" style={{ transform: bgTextTransform }}>
              <div 
                className="text-[14vw] font-black tracking-tighter leading-none text-[#0D1522] font-mono select-none"
                style={{
                  textShadow: "1px 1px 0px #182333, -1px -1px 0px #04080F, 0px 10px 40px rgba(0,0,0,0.8)",
                  opacity: 0.45
                }}
              >
                NEPTUNE
              </div>
              <div className="text-[1.5vw] font-mono tracking-widest text-[#152336] mt-4 font-bold">
                SUB-SEA LIQUIDITY EMITTER COUPLING UNIT
              </div>
            </div>

            {/* Glowing God-Ray Light Shaft overlay */}
            <div className="absolute inset-0 bg-radial-at-t from-[#4FC3F7]/5 via-[#070B11]_80% to-[#070B11] pointer-events-none z-0" />

            {/* Page Header Area */}
            <header className="relative border-b border-sky-950/40 bg-[#070B11]/70 backdrop-blur-md z-30">
              <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                
                {/* Brand Logo with magnetic pull */}
                <div 
                  ref={brandLogoRef}
                  onMouseMove={handleBrandMagneticMove}
                  onMouseLeave={() => {
                    setBrandOffset({ x: 0, y: 0 });
                    setCursorHoverState("default");
                  }}
                  style={{ transform: `translate3d(${brandOffset.x}px, ${brandOffset.y}px, 0)` }}
                  className="flex items-center gap-3 cursor-pointer transition-transform duration-200 ease-out select-none" 
                  onClick={() => window.location.reload()}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B35] to-[#4FC3F7] p-[1.5px] transition hover:scale-105">
                    <div className="w-full h-full rounded-[11px] bg-[#070B11] flex items-center justify-center">
                      <Flame className="w-5 h-5 text-[#FF6B35]" />
                    </div>
                  </div>
                  <div>
                    <span className="font-extrabold text-lg tracking-tight uppercase text-white">Neptune</span>
                    <span className="text-[10px] text-[#4FC3F7] ml-2 font-mono border border-sky-400/20 px-1.5 py-0.5 rounded bg-sky-950/20">Abyssal v2.0</span>
                  </div>
                </div>

                {/* Navbar links */}
                <nav className="hidden md:flex items-center gap-8 text-xs font-mono font-black uppercase tracking-wider text-[#94A3B8]">
                  <a href="#compliance" className="hover:text-white transition flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#FF6B35]" /> Regulatory compliance</a>
                  <a href="#geospatial" className="hover:text-white transition flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-[#4FC3F7]" /> Geospatial matching</a>
                  <a href="#contracts" className="hover:text-white transition flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-amber-500" /> Thermal settlements</a>
                </nav>

                {/* Authentication routing */}
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

            {/* Hero Deep Water Grid Floor */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column Content - with gentle mouse tracking parallax */}
              <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left transition-transform duration-300 ease-out" style={{ transform: heroTextTransform }}>
                
                {/* Embedded CE Directive announcement slab */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#FF6B35]/20 bg-[#FF6B35]/10 text-[#FF6B35] text-[10px] font-mono mb-6 w-fit mx-auto lg:mx-0 shadow-inner"
                >
                  <ShieldCheck className="w-3.5 h-3.5 animate-pulse text-[#FF6B35]" />
                  <span>EU COM_DIRECTIVE CE-96 COMPLIANT FLUID HARBOR</span>
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                  className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none text-white uppercase font-sans"
                >
                  Turn Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B35] to-[#F59E0B] sm:block">Thermal Exhaust</span> Into Liquid Energy Asset.
                </motion.h1>

                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-6 text-[#94A3B8] text-sm md:text-base max-w-xl leading-relaxed mx-auto lg:mx-0 font-sans font-medium"
                >
                  Neptune coordinates geothermal routing pipelines, mapping unrecovered thermal heat waste from high-density edge Data Centers directly to municipal heating grids and local aquaculture buyers. Stay CE-directive compliant while trading BTU capacity at absolute scale.
                </motion.p>

                {/* Primary Interaction Board */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45 }}
                  className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                >
                  <button
                    id="hero-get-started-btn"
                    ref={ctaBtnRef}
                    onMouseMove={handleCtaMagneticMove}
                    onMouseLeave={() => {
                      setCtaOffset({ x: 0, y: 0 });
                      setCursorHoverState("default");
                    }}
                    onClick={() => onNavigate("register")}
                    style={{ transform: `translate3d(${ctaOffset.x}px, ${ctaOffset.y}px, 0)` }}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#E25C2B] text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-2xl shadow-[#FF6B35]/25 hover:shadow-[#FF6B35]/40 transition duration-150 ease-out transform cursor-pointer"
                  >
                    Get Enrolled Free
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
                    onClick={() => onNavigate("login")}
                    style={{ transform: `translate3d(${demoOffset.x}px, ${demoOffset.y}px, 0)` }}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl border border-sky-500/25 bg-sky-950/20 text-[#4FC3F7] hover:text-white hover:bg-sky-900/30 font-black uppercase tracking-wider text-xs transition duration-150 ease-out flex items-center justify-center gap-2 cursor-pointer backdrop-blur"
                  >
                    Demo Simulator Node
                  </button>
                </motion.div>
              </div>

              {/* Right Column Content - Micro Interactive glassmorphic dashboard widget */}
              <div className="lg:col-span-5 relative flex justify-center mt-8 lg:mt-0" style={{ perspective: "1000px" }}>
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.2 }}
                  onMouseEnter={() => setCursorHoverState("card")}
                  onMouseLeave={() => setCursorHoverState("default")}
                  className="w-full max-w-[420px] bg-[#111622]/40 border border-sky-500/20 rounded-3xl p-7 shadow-3xl relative overflow-hidden backdrop-blur-xl relative group transition-transform duration-300 ease-out cursor-none"
                  style={{
                    boxShadow: "0 25px 50px -12px rgba(6, 12, 23, 0.95), inset 0 1px 1px rgba(255,255,255,0.05)",
                    transform: glassCardTransform
                  }}
                >
                  {/* Glass shimmer refraction effect overlay */}
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#FF6B35]/20 to-transparent blur-2xl pointer-events-none group-hover:scale-125 transition duration-500" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#4FC3F7]/15 to-transparent blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-mono text-[#4FC3F7] tracking-widest uppercase flex items-center gap-1.5 font-bold">
                      <Droplets className="w-3.5 h-3.5 animate-pulse text-[#4FC3F7]" /> Integrated telemetry
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                      COUPLED LIVE
                    </span>
                  </div>

                  {/* Operational simulator parameters */}
                  <div className="space-y-4 relative z-10">
                    
                    {/* Simulator Row 1 */}
                    <div className="p-4 bg-[#070A11]/80 border border-sky-950/40 rounded-xl hover:border-sky-500/20 transition">
                      <div className="flex justify-between text-[10px] font-mono text-gray-400">
                        <span>DATA CENTER INJECTION POINT</span>
                        <span>EXIT LIQUID TEMP</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-1.5">
                        <span className="font-bold text-sm text-gray-100">Mandideep DC Core-A</span>
                        <span className="font-mono text-[#FF6B35] font-black text-base">{simTemp}°C</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1 rounded overflow-hidden mt-3">
                        <div className="h-full bg-[#FF6B35]" style={{ width: `${(simTemp / 100) * 100}%` }} />
                      </div>
                    </div>

                    {/* Simulator Row 2 */}
                    <div className="p-4 bg-[#070A11]/80 border border-sky-950/40 rounded-xl hover:border-sky-500/20 transition">
                      <div className="flex justify-between text-[10px] font-mono text-gray-400">
                        <span>GEOSPATIAL MATCHING NODE</span>
                        <span>PIPE HEAT DROP LOSS</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-1.5">
                        <span className="text-[#4FC3F7] font-bold text-sm">Industrial District Grid</span>
                        <span className="font-mono text-gray-200 text-xs font-bold">0.45°C / 1.05km</span>
                      </div>
                      <p className="text-[9px] font-mono text-emerald-400 mt-2">✔ COMPATIBILITY COEFFICIENT: 94.2% OPTIMAL</p>
                    </div>

                    {/* Simulator Row 3 - Settlement ledger card */}
                    <div className="p-4 bg-gradient-to-r from-[#FF6B35]/15 to-[#4FC3F7]/5 border border-[#FF6B35]/30 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-mono text-[#FF6B35] font-black uppercase tracking-widest">Coupled Smart Transfer</div>
                        <div className="text-sm font-black mt-0.5">{simGJ} Gigajoules Active</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-[#FF6B35]">€{(simGJ * 4.8).toFixed(2)}</span>
                        <span className="block text-[8px] font-mono text-gray-400 mt-0.5">SHA-256 Ledger Logged</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Pillar Information Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 py-16 border-t border-sky-950/40" id="compliance">
              <div className="text-center max-w-xl mx-auto mb-14">
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
                  COUPLED GRID RECOVERY
                </h2>
                <p className="text-xs font-mono text-[#4FC3F7] mt-1.5 uppercase tracking-widest font-bold">
                  Three operational frameworks bound into one compliance hub
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Pillar 1 */}
                <div 
                  onMouseEnter={() => setCursorHoverState("card")}
                  onMouseLeave={() => setCursorHoverState("default")}
                  className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-[#FF6B35]/40 transition duration-300 hover:bg-[#111622]/30 group backdrop-blur lg:cursor-none"
                >
                  <div className="w-12 h-12 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                    <ShieldCheck className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-base font-black font-semibold uppercase tracking-tight text-white mb-2">1. Regulatory Guard</h3>
                  <p className="text-[#94A3B8] text-xs leading-relaxed">
                    Compute your exact Energy Reuse Factor (ERF) in real time. Safeguard operations from severe EU computing penalty risks with active, machine-verified telemetry logging.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div 
                  onMouseEnter={() => setCursorHoverState("card")}
                  onMouseLeave={() => setCursorHoverState("default")}
                  className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-[#4FC3F7]/40 transition duration-300 hover:bg-[#111622]/30 group backdrop-blur lg:cursor-none" 
                  id="geospatial"
                >
                  <div className="w-12 h-12 bg-[#4FC3F7]/10 border border-[#4FC3F7]/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                    <Globe className="w-5 h-5 text-[#4FC3F7]" />
                  </div>
                  <h3 className="text-base font-black font-semibold uppercase tracking-tight text-white mb-2">2. Geothermal Mapping</h3>
                  <p className="text-[#94A3B8] text-xs leading-relaxed">
                    Map district greenhouse setups, municipal buyers and industrial steam grids using Neptune's high precision geospatial thermodynamic routing algorithm.
                  </p>
                </div>

                {/* Pillar 3 */}
                <div 
                  onMouseEnter={() => setCursorHoverState("card")}
                  onMouseLeave={() => setCursorHoverState("default")}
                  className="bg-[#111622]/20 border border-sky-950/40 rounded-2xl p-6 hover:border-amber-500/40 transition duration-300 hover:bg-[#111622]/30 group backdrop-blur lg:cursor-none" 
                  id="contracts"
                >
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition">
                    <Layers className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-base font-black font-semibold uppercase tracking-tight text-white mb-2">3. Fluid Settlement</h3>
                  <p className="text-[#94A3B8] text-xs leading-relaxed">
                    Directly link smart digital heat contracts with secure automated accounting. Transfer credits and download cryptographic legal documentation instantly.
                  </p>
                </div>
              </div>
            </section>

            {/* Footer and Credits */}
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
