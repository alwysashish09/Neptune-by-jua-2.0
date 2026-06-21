/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { Facility, Match } from "../types.js";
import { getDistanceKm } from "../matchingService.js";

interface MapCanvasProps {
  facilities: Facility[];
  matches: Match[];
  selectedFacility: Facility | null;
  selectedMatch: Match | null;
  searchRadiusKm: number;
  onSelectFacility: (facility: Facility) => void;
}

export default function MapCanvas({
  facilities,
  matches,
  selectedFacility,
  selectedMatch,
  searchRadiusKm,
  onSelectFacility
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });
  const [hoveredNode, setHoveredNode] = useState<Facility | null>(null);

  // Set the default GIS center on Bhopal
  const mapCenter = { lat: 23.2599, lng: 77.4126 };
  
  // Coordinate scaler
  // 1 degree latitude = approx 111 km
  // 1 degree longitude = approx 102 km at Bhopal latitude
  const latKm = 111;
  const lngKm = 102;

  // Handle ResizeObserver to remain fluid and prevent hardcoded pixel glitches
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height, 350)
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Spatial projection
  const latLngToXY = (lat: number, lng: number) => {
    const dLat = lat - mapCenter.lat;
    const dLng = lng - mapCenter.lng;

    // Convert degrees difference to localized Km offset from center
    const xKm = dLng * lngKm;
    const yKm = dLat * latKm; // positive is north

    // Scaling factors (e.g., 25 pixels per km)
    // Dynamic calculate zoom scaler based on search radius
    const scale = Math.min(dimensions.width, dimensions.height) / (searchRadiusKm * 2.5);

    // Center of canvas is (width/2, height/2). 
    // Remember Y is inverted in browser canvas coordinate space
    const x = dimensions.width / 2 + xKm * scale;
    const y = dimensions.height / 2 - yKm * scale;

    return { x, y };
  };

  const xyToLatLng = (x: number, y: number) => {
    const scale = Math.min(dimensions.width, dimensions.height) / (searchRadiusKm * 2.5);
    const xKm = (x - dimensions.width / 2) / scale;
    const yKm = (dimensions.height / 2 - y) / scale;

    const lng = mapCenter.lng + xKm / lngKm;
    const lat = mapCenter.lat + yKm / latKm;

    return { lat, lng };
  };

  // Redraw Canvas on updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and fill dark space
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = "#0D121B";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const centerScale = Math.min(dimensions.width, dimensions.height) / (searchRadiusKm * 2.5);

    // 1. Draw Grid Lines
    ctx.strokeStyle = "#1A2333";
    ctx.lineWidth = 1;

    // Circle Grid Radii (Intervals of 2km, 5km, searchRadius)
    const radii = [2, 5, searchRadiusKm];
    for (const r of radii) {
      if (r > searchRadiusKm * 1.5) continue;
      const pxRad = r * centerScale;
      ctx.beginPath();
      ctx.arc(dimensions.width / 2, dimensions.height / 2, pxRad, 0, 2 * Math.PI);
      ctx.stroke();

      // Radii Labels
      ctx.fillStyle = "#4A5D78";
      ctx.font = "9px monospace";
      ctx.fillText(`${r} km`, dimensions.width / 2 + pxRad + 5, dimensions.height / 2 + 3);
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(dimensions.width / 2, 20);
    ctx.lineTo(dimensions.width / 2, dimensions.height - 20);
    ctx.moveTo(20, dimensions.height / 2);
    ctx.lineTo(dimensions.width - 20, dimensions.height / 2);
    ctx.stroke();

    // 2. Draw Match Connecting Pipes (Pipelines)
    for (const match of matches) {
      const source = facilities.find(f => f.id === match.sourceFacilityId);
      const buyer = facilities.find(f => f.id === match.buyerFacilityId);

      if (source && buyer) {
        const sXY = latLngToXY(source.latitude, source.longitude);
        const bXY = latLngToXY(buyer.latitude, buyer.longitude);

        const isMatchSelected = selectedMatch && selectedMatch.id === match.id;
        
        ctx.beginPath();
        ctx.moveTo(sXY.x, sXY.y);
        ctx.lineTo(bXY.x, bXY.y);

        if (isMatchSelected) {
          ctx.strokeStyle = "#FF6B35";
          ctx.lineWidth = 3;
          // Set shadow glowing effect
          ctx.shadowColor = "#FF6B35";
          ctx.shadowBlur = 8;
        } else if (match.status === "ACCEPTED") {
          ctx.strokeStyle = "#22C55E";
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = "#2B3A4F";
          ctx.lineWidth = 1.5;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw active directional fluid flow on pipelines
        if (match.status === "ACCEPTED" || isMatchSelected) {
          const t = (Date.now() % 3000) / 3000; // repeating cycle
          const flowX = sXY.x + (bXY.x - sXY.x) * t;
          const flowY = sXY.y + (bXY.y - sXY.y) * t;

          ctx.beginPath();
          ctx.arc(flowX, flowY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = match.status === "ACCEPTED" ? "#22C55E" : "#FF6B35";
          ctx.fill();
        }
      }
    }

    // 3. Draw All Facilities/Nodes
    for (const fac of facilities) {
      const xy = latLngToXY(fac.latitude, fac.longitude);
      const isSource = fac.type === "DATA_CENTER";
      const isSelected = selectedFacility && selectedFacility.id === fac.id;
      const isHovered = hoveredNode && hoveredNode.id === fac.id;

      // Draw Glowing rings for selected/hovered nodes
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(xy.x, xy.y, isSource ? 18 : 14, 0, 2 * Math.PI);
        ctx.fillStyle = isSource ? "rgba(255, 107, 53, 0.15)" : "rgba(79, 195, 247, 0.15)";
        ctx.fill();
        ctx.strokeStyle = isSource ? "#FF6B35" : "#4FC3F7";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Center point anchor
      ctx.beginPath();
      ctx.arc(xy.x, xy.y, isSource ? 8 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = isSource ? "#FF6B35" : "#4FC3F7";
      ctx.fill();
      ctx.strokeStyle = "#0A0E14";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Quick source pulsate animation
      if (isSource) {
        const pulse = 8 + Math.abs(Math.sin(Date.now() / 400)) * 5;
        ctx.beginPath();
        ctx.arc(xy.x, xy.y, pulse, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 107, 53, 0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Text Labels
      ctx.fillStyle = isSelected ? "#FFFFFF" : "#94A3B8";
      ctx.font = isSelected ? "bold 10px Inter, sans-serif" : "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fac.name, xy.x, xy.y - (isSource ? 14 : 11));
    }

    // 4. Scale compass indicator
    ctx.strokeStyle = "#4A5D78";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, dimensions.height - 30);
    ctx.lineTo(80, dimensions.height - 30);
    ctx.moveTo(30, dimensions.height - 35);
    ctx.lineTo(30, dimensions.height - 25);
    ctx.moveTo(80, dimensions.height - 35);
    ctx.lineTo(80, dimensions.height - 25);
    ctx.stroke();

    ctx.fillStyle = "#94A3B8";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    // 50 pixels representing real scaling distance
    const compDistance = (50 / centerScale).toFixed(1);
    ctx.fillText(`${compDistance} km`, 55, dimensions.height - 38);

  }, [dimensions, facilities, matches, selectedFacility, selectedMatch, hoveredNode, searchRadiusKm]);

  // Track animation frame to continuously refresh flow animations
  useEffect(() => {
    let animId: number;
    const loop = () => {
      canvasRef.current && canvasRef.current.getContext("2d") && canvasRef.current.dispatchEvent(new Event("redraw"));
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Event handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check hit test
    let found: Facility | null = null;
    for (const fac of facilities) {
      const xy = latLngToXY(fac.latitude, fac.longitude);
      const dx = x - xy.x;
      const dy = y - xy.y;
      const radius = 14;

      if (dx * dx + dy * dy <= radius * radius) {
        found = fac;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      onSelectFacility(hoveredNode);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#0D121B] rounded-xl border border-[#161F30]">
      <canvas
        id="gis-map-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="block cursor-pointer"
      />
      
      {/* Dynamic Overlay HUD display */}
      <div className="absolute top-4 left-4 bg-[#131822]/90 border border-[#1F2733] rounded-lg p-3 backdrop-blur-md text-xs font-mono select-none space-y-1">
        <div className="text-white font-semibold flex items-center gap-1">
          <span className="w-2 h-2 bg-gradient-to-tr from-[#FF6B35] to-orange-400 rounded-full animate-ping" />
          BHOPAL GIS VIEW
        </div>
        <div className="text-[#94A3B8]">Datum: WGS 84 / UTM Grid</div>
        <div className="text-[#94A3B8]">Grid Radius: {searchRadiusKm} km</div>
        <div className="text-[#94A3B8]">Emitters: {facilities.filter(f => f.type === "DATA_CENTER").length} </div>
        <div className="text-[#94A3B8]">Heat Sinks: {facilities.filter(f => f.type === "HEAT_BUYER").length} </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-[#131822]/90 border border-[#1F2733] rounded-lg p-2.5 backdrop-blur-sm text-[10px] uppercase font-mono space-y-1">
        <div className="flex items-center gap-1.5 text-[#FF6B35]">
          <span className="w-2 h-2 bg-[#FF6B35] rounded-full" />
          <span>Primary Emitter (Source)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#4FC3F7]">
          <span className="w-2 h-2 bg-[#4FC3F7] rounded-full" />
          <span>Heat Sink (Buyer)</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-500">
          <span className="w-2.5 h-0.5 bg-green-500 inline-block" />
          <span>Active Pipe Contract</span>
        </div>
      </div>
    </div>
  );
}
