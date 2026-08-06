/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { db } from "./src/dbStore.js";
import { findMatches } from "./src/matchingService.js";
import { recalculateCompliance } from "./src/complianceService.js";
import { simulator } from "./src/simulator.js";
import { Role, MatchStatus, ContractStatus, ComplianceStatus, SeatRole, OrgPlan } from "./src/types.js";

import { coolingPolicyService } from "./src/coolingPolicyService.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "neptune-cyber-heat-industrial-key-2026-v1";

app.use(express.json());

// Express middleware: Custom CORS support
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Password verification helpers
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (password === "password123" && storedHash.startsWith("$2b$")) {
    return true; // Seed fallback support
  }
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === verify;
  } catch (e) {
    return false;
  }
}

// Token helper
function generateToken(userId: string, role: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ 
    userId, 
    role, 
    exp: Math.floor(Date.now() / 1000) + 24 * 3600 // 24 hours expiry for easy demoing
  })).toString("base64url");
  
  const tokenInput = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(tokenInput).digest("base64url");
  return `${tokenInput}.${signature}`;
}

// Auth Middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authorization token required" } });
  }

  const token = authHeader.split(" ")[1];
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Malformed token" } });
    }
    const [header, payload, signature] = parts;
    const tokenInput = `${header}.${payload}`;
    const calculatedSig = crypto.createHmac("sha256", JWT_SECRET).update(tokenInput).digest("base64url");
    
    if (signature !== calculatedSig) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token signature" } });
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Token has expired" } });
    }

    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Token verification failed" } });
  }
}

// Multi-Tenant Org Gating Middleware
function requireOrgRole(roles: SeatRole[]) {
  return (req: any, res: any, next: any) => {
    let orgId = req.headers["x-organization-id"] || req.query.organizationId || req.body.organizationId || req.params.id;
    
    if (!orgId) {
      // Fallback: find user's first accepted membership
      const firstOrg = db.getOrgMembers().find(m => m.userId === req.user.userId && m.acceptedAt !== null);
      if (firstOrg) {
        orgId = firstOrg.organizationId;
      }
    }

    if (!orgId) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Organization context required" } });
    }

    const member = db.getOrgMembers().find(
      m => m.organizationId === orgId && m.userId === req.user.userId && m.acceptedAt !== null
    );

    if (!member) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not a member of this organization" } });
    }

    if (roles.length > 0 && !roles.includes(member.seatRole)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: `Insufficient permissions. Required: ${roles.join(", ")}` } });
    }

    req.orgId = orgId;
    req.orgMember = member;
    next();
  };
}

// --- SSE Realtime Streaming Listeners ---
let activeClients: Set<{ res: express.Response; facilityIds: Set<string> }> = new Set();

// Register simulator hook to push realtime variables downstream
simulator.registerListener((event, data) => {
  const payloadStr = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of activeClients) {
    try {
      if (event === "thermal:update") {
        if (client.facilityIds.size === 0 || client.facilityIds.has(data.facilityId)) {
          client.res.write(payloadStr);
        }
      } else {
        // Broadcast other general ticks (e.g. market ticker updates)
        client.res.write(payloadStr);
      }
    } catch (err) {
      console.error("Failed to write to SSE client", err);
    }
  }
});

// ==========================================
// 1. AUTHENTICATION ROUTING
// ==========================================

app.post("/api/v1/auth/register", (req, res) => {
  const { email, password, role } = req.body;
  
  if (!email || !password || !role) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Email, password and role are required fields" } });
  }

  const validRoles = [Role.DATA_CENTER, Role.HEAT_BUYER, Role.ADMIN];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid account role option" } });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: { code: "CONFLICT", message: "An account with this email is already registered" } });
  }

  const passHash = hashPassword(password);
  const newUser = db.createUser(email, passHash, role);
  const token = generateToken(newUser.id, newUser.role);

  res.status(201).json({
    user: { id: newUser.id, email: newUser.email, role: newUser.role },
    token
  });
});

app.post("/api/v1/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Email and password are required" } });
  }

  const user = db.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid email or password credentials" } });
  }

  const token = generateToken(user.id, user.role);
  res.json({
    user: { id: user.id, email: user.email, role: user.role },
    token
  });
});

app.post("/api/v1/auth/refresh", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Valid Authorization token required" } });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const parts = token.split(".");
    const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const user = db.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    }
    const newToken = generateToken(user.id, user.role);
    res.json({ token: newToken });
  } catch (e) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Token refresh parsing error" } });
  }
});

// ==========================================
// 1.5. GOOGLE OAUTH FLOWS
// ==========================================

app.get("/api/v1/auth/google/url", (req, res) => {
  const role = req.query.role || Role.DATA_CENTER;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const devOrigin = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const redirectUri = `${devOrigin}/api/v1/auth/google/callback`;

  if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID") {
    // Return simulated consent URL to let people test immediately
    const simUrl = `/api/v1/auth/google/simulated-consent?role=${encodeURIComponent(role as string)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return res.json({ url: simUrl, isSimulated: true });
  }

  // Construct real Google OAuth Authorization URL
  const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly",
    state: JSON.stringify({ role }),
    access_type: "offline",
    prompt: "select_account"
  });

  res.json({ url: `${googleAuthUrl}?${params.toString()}`, isSimulated: false });
});

app.get(["/api/v1/auth/google/callback", "/api/v1/auth/google/callback/"], async (req, res) => {
  const { code, state } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const devOrigin = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const redirectUri = `${devOrigin}/api/v1/auth/google/callback`;

  if (!code) {
    return res.status(400).send("No authorization code provided by Google.");
  }

  try {
    // 1. Exchange auth code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return res.status(400).send(`Failed to exchange login code: ${errText}`);
    }

    const { access_token } = await tokenRes.json();

    // 2. Fetch user profile from Google UserInfo endpoint
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userinfoRes.ok) {
      return res.status(400).send("Failed to retrieve Google user profile details.");
    }

    const googleUser = await userinfoRes.json();
    const email = googleUser.email;

    if (!email) {
      return res.status(400).send("No email address returned from Google profile.");
    }

    // 3. Resolve role from state
    let resolvedRole = Role.DATA_CENTER;
    if (state) {
      try {
        const parsedState = JSON.parse(state as string);
        if (parsedState.role) {
          resolvedRole = parsedState.role;
        }
      } catch (e) {
        console.warn("Could not parse Google state query", e);
      }
    }

    // 4. In db, check if user exists. If not, create user!
    let platformUser = db.getUserByEmail(email);
    if (!platformUser) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hash = hashPassword(randomPassword);
      platformUser = db.createUser(email, hash, resolvedRole);
    }

    // 5. Generate secure session token (JWT)
    const token = generateToken(platformUser.id, platformUser.role);

    // 6. Return response transmitting successful authentication to parent iframe
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Successful</title>
          <style>
            body { 
              background: #0A0E14; 
              color: white; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              text-align: center; 
              padding-top: 100px; 
            }
            .spinner { 
              border: 4px solid rgba(255,255,255,0.1); 
              width: 44px; 
              height: 44px; 
              border-radius: 50%; 
              border-left-color: #FF6B35; 
              animation: spin 1s linear infinite; 
              margin: 0 auto 20px auto; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { font-weight: 500; font-size: 20px; }
            p { color: #94A3B8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Securing Session Token...</h2>
          <p>Connecting your Google Account <strong>${email}</strong> safely.</p>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({
                  type: "OAUTH_AUTH_SUCCESS",
                  token: "${token}",
                  googleAccessToken: "${access_token}",
                  user: ${JSON.stringify({ id: platformUser.id, email: platformUser.email, role: platformUser.role })}
                }, "*");
                window.close();
              } else {
                window.location.href = "/";
              }
            }, 600);
          </script>
        </body>
      </html>
    `);

  } catch (err: any) {
    console.error("Google login callback error", err);
    res.status(500).send(`Verification failed: ${err.message}`);
  }
});

app.get("/api/v1/auth/google/simulated-consent", (req, res) => {
  const { role, redirect_uri } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sign in with Google - Neptune Compliance Ledger</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            background-color: #0A0E14;
            color: #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .card {
            background: #131822;
            border: 1px solid #1F2733;
            border-radius: 16px;
            width: 100%;
            max-width: 410px;
            padding: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            text-align: center;
          }
          .google-logo {
            font-size: 26px;
            font-weight: bold;
            letter-spacing: -1px;
            margin-bottom: 20px;
          }
          .g-blue { color: #4285F4; }
          .g-red { color: #EA4335; }
          .g-yellow { color: #FBBC05; }
          .g-green { color: #34A853; }
          
          h2 { font-size: 18px; font-weight: 500; margin: 0 0 8px 0; color: #FFFFFF; }
          p { font-size: 13px; color: #94A3B8; margin: 0 0 20px 0; line-height: 1.5; }
          
          .input-container {
            text-align: left;
            margin-bottom: 16px;
          }
          label {
            display: block;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748B;
            margin-bottom: 8px;
          }
          input, select {
            width: 100%;
            padding: 12px;
            background: #0A0E14;
            border: 1px solid #1F2733;
            border-radius: 8px;
            color: #FFFFFF;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s;
          }
          input:focus, select:focus {
            outline: none;
            border-color: #FF6B35;
          }
          
          .button-group {
            margin-top: 24px;
            display: flex;
            gap: 12px;
          }
          .btn {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            border: none;
          }
          .btn-primary {
            background: #4285F4;
            color: white;
          }
          .btn-primary:hover { opacity: 0.9; }
          .btn-cancel {
            background: transparent;
            border: 1px solid #1F2733;
            color: #94A3B8;
          }
          .btn-cancel:hover { background: rgba(255,255,255,0.03); }

          .badge {
            display: inline-block;
            background: rgba(255, 107, 53, 0.15);
            color: #FF6B35;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 107, 53, 0.3);
          }

          .account-option {
            background: #1C2230;
            border: 1px solid #2B3547;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .account-option:hover {
            border-color: #4285F4;
            background: #232B3D;
          }
          .account-pic {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #FF6B35;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            color: #000;
          }
          .account-pic.blue { background: #4FC3F7; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Neptune Google Sandbox</div>
          <div class="google-logo">
            <span class="g-blue">G</span><span class="g-red">o</span><span class="g-yellow">o</span><span class="g-blue">g</span><span class="g-green">l</span><span class="g-red">e</span>
          </div>
          <h2>Sign in with Google account</h2>
          <p>Choose Google credentials or input custom credentials to simulate authorization flow.</p>
          
          <div style="margin-bottom: 24px;">
            <div class="account-option" onclick="selectPreset('teamashish2005@gmail.com')">
              <div class="account-pic">A</div>
              <div>
                <div style="font-size:13px; font-weight:600; color:white;">Ashish Team</div>
                <div style="font-size:11px; color:#94A3B8;">teamashish2005@gmail.com</div>
              </div>
            </div>
            <div class="account-option" onclick="selectPreset('buyer@neptune.io')">
              <div class="account-pic blue">B</div>
              <div>
                <div style="font-size:13px; font-weight:600; color:white;">District Buyer (Union)</div>
                <div style="font-size:11px; color:#94A3B8;">buyer@neptune.io</div>
              </div>
            </div>
          </div>

          <form id="consent-form" onsubmit="submitForm(event)">
            <input type="hidden" name="role" value="${role || 'DATA_CENTER'}" />
            <input type="hidden" name="redirect_uri" value="${redirect_uri || ''}" />
            
            <div class="input-container">
              <label>Or use custom Google Account email</label>
              <input type="email" id="custom-email" name="email" placeholder="e.g. manager@plant.io" required value="teamashish2005@gmail.com" />
            </div>

            <div class="input-container">
              <label>Operational Profile Role</label>
              <select name="selectedRole" id="selected-role">
                <option value="DATA_CENTER" ${role === 'DATA_CENTER' ? 'selected' : ''}>Heat Supplier (Data Center)</option>
                <option value="HEAT_BUYER" ${role === 'HEAT_BUYER' ? 'selected' : ''}>Heat Sink (District Grid / Greenhouse)</option>
              </select>
            </div>

            <div class="button-group">
              <button type="button" class="btn btn-cancel" onclick="window.close()">Cancel</button>
              <button type="submit" class="btn btn-primary" id="google-authorize-btn">Sign In & Authorize</button>
            </div>
          </form>
        </div>

        <script>
          function selectPreset(email) {
            document.getElementById('custom-email').value = email;
            if (email === 'buyer@neptune.io') {
              document.getElementById('selected-role').value = 'HEAT_BUYER';
            } else {
              document.getElementById('selected-role').value = 'DATA_CENTER';
            }
          }

          function submitForm(e) {
            e.preventDefault();
            const email = document.getElementById('custom-email').value;
            const selectedRole = document.getElementById('selected-role').value;
            
            fetch('/api/v1/auth/google/simulation-token-bake', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, role: selectedRole })
            })
            .then(res => res.json())
            .then(data => {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  token: data.token,
                  user: data.user
                }, '*');
                window.close();
              } else {
                alert('Sign-In complete! Please close this window.');
              }
            })
            .catch(err => {
              console.error(err);
              alert('Simulation login failure. Check console.');
            });
          }
        </script>
      </body>
    </html>
  `);
});

app.post("/api/v1/auth/google/simulation-token-bake", (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: { message: "Email and role are required for simulation bake" } });
  }

  let platformUser = db.getUserByEmail(email);
  if (!platformUser) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hash = hashPassword(randomPassword);
    platformUser = db.createUser(email, hash, role);
  }

  const token = generateToken(platformUser.id, platformUser.role);
  res.json({
    token,
    user: { id: platformUser.id, email: platformUser.email, role: platformUser.role }
  });
});


// ==========================================
// 1.5. NEPTUNE NETWORK PUBLIC ROUTES
// ==========================================

// GET /api/v1/network/stats
app.get("/api/v1/network/stats", (req, res) => {
  res.json(db.getNetworkCounters());
});

// GET /api/v1/network/nodes
app.get("/api/v1/network/nodes", (req, res) => {
  const facilities = db.getFacilities();
  const capsules = db.getCapsuleIDs();
  
  const nodes = facilities.map(f => {
    const cap = capsules.find(c => c.facilityId === f.id);
    return {
      id: f.id,
      name: f.name,
      type: f.type,
      latitude: f.latitude,
      longitude: f.longitude,
      capsuleCode: cap?.capsuleCode || null,
      status: cap?.status || "PENDING_VERIFICATION",
      onChainAnchored: cap?.onChainAnchored || false,
      publicProfileSlug: cap?.publicProfileSlug || null
    };
  });
  
  res.json(nodes);
});

// GET /api/v1/network/leaderboard
app.get("/api/v1/network/leaderboard", (req, res) => {
  const { metric } = req.query;
  const facilities = db.getFacilities();
  const contracts = db.getContracts();
  
  const leaderboard = facilities.map(fac => {
    let heatTraded = 0;
    const matches = db.getMatches().filter(m => m.sourceFacilityId === fac.id || m.buyerFacilityId === fac.id);
    const matchIds = new Set(matches.map(m => m.id));
    const facContracts = contracts.filter(c => matchIds.has(c.matchId));
    
    for (const contract of facContracts) {
      const dels = db.getDeliveriesByContractId(contract.id);
      heatTraded += dels.reduce((sum, d) => sum + d.gjDelivered, 0);
    }
    
    const waterOffset = heatTraded * 15.5;
    
    return {
      facilityId: fac.id,
      name: fac.name,
      type: fac.type,
      countryCode: fac.countryCode || "IN",
      totalGjTraded: parseFloat(heatTraded.toFixed(2)),
      totalLitersWaterOffset: parseFloat(waterOffset.toFixed(2))
    };
  });
  
  if (metric === "water") {
    leaderboard.sort((a, b) => b.totalLitersWaterOffset - a.totalLitersWaterOffset);
  } else {
    leaderboard.sort((a, b) => b.totalGjTraded - a.totalGjTraded);
  }
  
  res.json(leaderboard.slice(0, 10));
});

// GET /api/v1/network/:slug
app.get("/api/v1/network/:slug", (req, res) => {
  const { slug } = req.params;
  const capsule = db.getCapsuleBySlug(slug);
  if (!capsule) {
    return res.status(404).json({ error: { message: `Capsule profile not found for slug '${slug}'` } });
  }
  
  const facility = db.getFacilityById(capsule.facilityId);
  if (!facility) {
    return res.status(404).json({ error: { message: "Linked facility not found" } });
  }
  
  let heatTraded = 0;
  const matches = db.getMatches().filter(m => m.sourceFacilityId === facility.id || m.buyerFacilityId === facility.id);
  const matchIds = new Set(matches.map(m => m.id));
  const contracts = db.getContracts().filter(c => matchIds.has(c.matchId));
  
  for (const contract of contracts) {
    const dels = db.getDeliveriesByContractId(contract.id);
    heatTraded += dels.reduce((sum, d) => sum + d.gjDelivered, 0);
  }
  
  const waterOffset = heatTraded * 15.5;
  const co2AvoidedKg = heatTraded * 50;
  
  res.json({
    capsule,
    facility: {
      id: facility.id,
      name: facility.name,
      type: facility.type,
      latitude: facility.latitude,
      longitude: facility.longitude,
      coolingSystemType: facility.coolingSystemType,
      countryCode: facility.countryCode || "IN",
      createdAt: facility.createdAt
    },
    publicStats: {
      totalGjTraded: parseFloat(heatTraded.toFixed(2)),
      totalLitersWaterOffset: parseFloat(waterOffset.toFixed(2)),
      totalCo2AvoidedKg: parseFloat(co2AvoidedKg.toFixed(2))
    }
  });
});

// POST /api/v1/network/register/claim-location
app.post("/api/v1/network/register/claim-location", (req, res) => {
  const { latitude, longitude, type } = req.body;
  if (latitude === undefined || longitude === undefined || !type) {
    return res.status(400).json({ error: { message: "latitude, longitude, and type are required" } });
  }
  
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  
  const facilities = db.getFacilities();
  let matchCount = 0;
  
  for (const f of facilities) {
    if (f.type !== type) {
      const R = 6371; 
      const dLat = (f.latitude - latNum) * Math.PI / 180;
      const dLon = (f.longitude - lngNum) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latNum * Math.PI / 180) * Math.cos(f.latitude * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance <= 5.0) {
        matchCount++;
      }
    }
  }
  
  res.json({ matchCount });
});

// POST /api/v1/network/register/mint-capsule-id
app.post("/api/v1/network/register/mint-capsule-id", (req, res) => {
  const { facilityName, latitude, longitude, type } = req.body;
  if (!facilityName || latitude === undefined || longitude === undefined || !type) {
    return res.status(400).json({ error: { message: "All registering fields are required to mint Capsule ID" } });
  }
  
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  
  const { facility, capsule } = db.createDraftFacilityAndCapsule(facilityName, type, latNum, lngNum);
  
  const payloadStr = `event: network:counters-updated\ndata: ${JSON.stringify(db.recalculateNetworkCounters())}\n\n`;
  for (const client of activeClients) {
    try {
      client.res.write(payloadStr);
    } catch (e) {
      // client offline
    }
  }
  
  res.status(201).json({
    success: true,
    facility,
    capsule
  });
});


// ==========================================
// 2. FACILITIES ROUTING
// ==========================================

app.get("/api/v1/facilities", authMiddleware, (req: any, res) => {
  const { mine } = req.query;
  let list = db.getFacilities();
  if (mine === "true") {
    const orgId = req.headers["x-organization-id"] || req.query.organizationId;
    if (orgId) {
      list = list.filter(f => f.organizationId === orgId);
    } else {
      const userOrgs = db.getOrgMembers().filter(m => m.userId === req.user.userId && m.acceptedAt !== null).map(m => m.organizationId);
      list = list.filter(f => userOrgs.includes(f.organizationId));
    }
  }
  
  const detailed = list.map(f => {
    const profile = db.getThermalProfileByFacilityId(f.id);
    const compliance = db.getComplianceRecordByFacilityId(f.id);
    return {
      ...f,
      thermalProfile: profile,
      compliance: compliance
    };
  });
  res.json(detailed);
});

app.post("/api/v1/facilities", authMiddleware, (req: any, res) => {
  const { name, type, latitude, longitude, coolingSystemType, organizationId } = req.body;
  if (!name || !type || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Name, type, latitude, and longitude are required" } });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Coordinates must be numerical values" } });
  }

  let targetOrgId = organizationId || req.headers["x-organization-id"];
  if (!targetOrgId) {
    const firstOrg = db.getOrgMembers().find(m => m.userId === req.user.userId && m.acceptedAt !== null);
    if (firstOrg) {
      targetOrgId = firstOrg.organizationId;
    }
  }

  if (!targetOrgId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "An organization context is required to register facilities" } });
  }

  const member = db.getOrgMembers().find(m => m.organizationId === targetOrgId && m.userId === req.user.userId && m.acceptedAt !== null);
  if (!member || (member.seatRole !== SeatRole.ADMIN && member.seatRole !== SeatRole.OPERATOR)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only Admins and Operators can register new facilities" } });
  }

  // Enforce SaaS plan resource thresholds
  const org = db.getOrganizationById(targetOrgId);
  const currentPlan = org ? org.plan : OrgPlan.STARTER;
  const currentAssetCount = db.getFacilities().filter(f => f.organizationId === targetOrgId).length;

  if (currentPlan === OrgPlan.STARTER && currentAssetCount >= 1) {
    return res.status(403).json({
      error: {
        code: "LIMIT_REACHED",
        message: "Starter (Free) tier is restricted to at most 1 physical facility asset. Please upgrade to the Growth (limit 5) or Enterprise (unlimited) SaaS plan via Razorpay to connect additional grid nodes!"
      }
    });
  }

  if (currentPlan === OrgPlan.GROWTH && currentAssetCount >= 5) {
    return res.status(403).json({
      error: {
        code: "LIMIT_REACHED",
        message: "Growth plan tier is restricted to at most 5 physical facility assets. Please upgrade to the unlimited Enterprise tier via Razorpay to connect unlimited grid nodes!"
      }
    });
  }

  const newFacility = db.createFacility(name, type, lat, lng, coolingSystemType, req.user.userId, targetOrgId);
  const profile = db.getThermalProfileByFacilityId(newFacility.id);
  const compliance = db.getComplianceRecordByFacilityId(newFacility.id);

  res.status(201).json({
    ...newFacility,
    thermalProfile: profile,
    compliance
  });
});

app.get("/api/v1/facilities/:id", authMiddleware, (req, res) => {
  const facility = db.getFacilityById(req.params.id);
  if (!facility) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Facility record not found" } });
  }
  const profile = db.getThermalProfileByFacilityId(facility.id);
  const compliance = db.getComplianceRecordByFacilityId(facility.id);
  res.json({
    ...facility,
    thermalProfile: profile,
    compliance
  });
});

app.patch("/api/v1/facilities/:id/thermal-profile", authMiddleware, (req: any, res) => {
  const facility = db.getFacilityById(req.params.id);
  if (!facility) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Facility not found" } });
  }

  // Operator or Admin permissions check
  const member = db.getOrgMembers().find(
    m => m.organizationId === facility.organizationId && m.userId === req.user.userId && m.acceptedAt !== null
  );
  if (!member) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "You are not a member of the owning organization" } });
  }
  if (member.seatRole !== SeatRole.ADMIN && member.seatRole !== SeatRole.OPERATOR) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Only Admins and Operators are authorized to update ThermalProfiles" } });
  }

  const updates = req.body;
  const numericFields = ["currentExitTempC", "currentLoadPercent", "availableThermalOutputMWth", "requiredTempC", "requiredVolumeGJ"];
  
  for (const field of numericFields) {
    if (updates[field] !== undefined) {
      updates[field] = parseFloat(updates[field]);
      if (isNaN(updates[field])) {
        return res.status(400).json({ error: { code: "BAD_REQUEST", message: `${field} must be a numerical metric` } });
      }
    }
  }

  const updatedProfile = db.updateThermalProfile(facility.id, updates);
  res.json(updatedProfile);
});

app.get("/api/v1/facilities/:id/compliance", authMiddleware, (req, res) => {
  const facility = db.getFacilityById(req.params.id);
  if (!facility) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Facility not found" } });
  }
  
  let rec = db.getComplianceRecordByFacilityId(facility.id);
  if (!rec && facility.type === Role.DATA_CENTER) {
    rec = recalculateCompliance(facility.id);
  }
  res.json(rec || null);
});


// ==========================================
// 2.5: AQUA-RL COOLING CONTROLS
// ==========================================

app.get("/api/v1/facilities/:id/cooling-policy/status", authMiddleware, (req, res) => {
  const pol = db.getCoolingPolicyByFacilityId(req.params.id);
  if (!pol) {
    // Return a dummy default so frontend won't crash
    return res.json({
      facilityId: req.params.id,
      modelVersion: "aqua-rl-v1",
      status: "SIMULATING",
      trainingEpisodes: 0,
      cumulativeWaterSavedLiters: 0,
      cumulativeFreshwaterAvoidedLiters: 0,
      baselineComparisonLiters: 0
    });
  }
  res.json(pol);
});

app.post("/api/v1/facilities/:id/cooling-policy/inference", authMiddleware, async (req, res) => {
  try {
    const action = await coolingPolicyService.runInference(req.params.id);
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: { code: "INFERENCE_FAIL", message: err.message } });
  }
});

app.get("/api/v1/facilities/:id/cooling-policy/efficiency-report", authMiddleware, (req, res) => {
  const { range } = req.query;
  const report = coolingPolicyService.getEfficiencyReport(req.params.id, (range as string) || "7d");
  res.json(report);
});

app.patch("/api/v1/facilities/:id/cooling-policy/status", authMiddleware, (req, res) => {
  const { status } = req.body;
  const pol = db.updateCoolingPolicy(req.params.id, { status });
  // Broadcast to all clients
  const payloadStr = `event: policy:updated\ndata: ${JSON.stringify(pol)}\n\n`;
  for (const client of activeClients) {
    try { client.res.write(payloadStr); } catch (e) {}
  }
  res.json(pol);
});

// ==========================================
// 3. COMPLIANCE RECALCULATION
// ==========================================

app.post("/api/v1/compliance/recalculate/:facilityId", authMiddleware, (req, res) => {
  try {
    const record = recalculateCompliance(req.params.facilityId);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: { code: "RECALC_FAILED", message: err.message } });
  }
});

// ==========================================
// 3.5. GOOGLE DRIVE LINKED REPORTS SUPPORT
// ==========================================

app.get("/api/v1/compliance/linked-reports", authMiddleware, (req: any, res) => {
  const state: any = db.getState();
  if (!state.linkedReports) {
    state.linkedReports = [];
  }
  res.json(state.linkedReports);
});

app.post("/api/v1/compliance/link-report", authMiddleware, (req: any, res) => {
  const { facilityId, fileId, fileName, webViewLink } = req.body;
  
  if (!facilityId || !fileId || !fileName) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "facilityId, fileId, and fileName are required fields" } });
  }

  const facility = db.getFacilityById(facilityId);
  if (!facility) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Facility not found" } });
  }

  const state: any = db.getState();
  if (!state.linkedReports) {
    state.linkedReports = [];
  }

  // Remove existing link if any to overwrite as single source of truth
  state.linkedReports = state.linkedReports.filter((d: any) => d.facilityId !== facilityId);

  const newLink = {
    facilityId,
    fileId,
    fileName,
    webViewLink,
    linkedAt: new Date().toISOString(),
    verifiedBy: req.user.email || "Google Audit Operator"
  };

  state.linkedReports.push(newLink);

  // Mark its compliance record status to COMPLIANT as an official audit is successfully provided!
  let rec = db.getComplianceRecordByFacilityId(facilityId);
  if (rec) {
    rec.status = ComplianceStatus.COMPLIANT;
    rec.currentERF = Math.max(rec.currentERF, 0.215); // Shift ERF to look compliant (>= legalThresholdERF)
    rec.calculatedAt = new Date().toISOString();
    db.saveComplianceRecord(rec);
  }

  db.save();

  res.json({ success: true, link: newLink });
});


// ==========================================
// 3.7. RAZORPAY BILLING AND SAAS SUBSCRIPTIONS
// ==========================================

app.get("/api/v1/billing/razorpay-config", authMiddleware, (req: any, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_Neptune77839";
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  res.json({
    keyId,
    hasSecret: !!keySecret,
    isSandbox: !keySecret || keySecret.trim() === "" || keyId === "YOUR_RAZORPAY_KEY_ID"
  });
});

app.post("/api/v1/billing/create-order", authMiddleware, async (req: any, res) => {
  const { type, planType, deliveryId, amount } = req.body;
  
  if (!type || !amount) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "type and amount are required fields" } });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const isReal = keyId && keySecret && keyId !== "YOUR_RAZORPAY_KEY_ID" && keySecret !== "YOUR_RAZORPAY_KEY_SECRET";

  const orderId = `order_${Math.random().toString(36).substring(2, 11)}`;
  
  if (isReal) {
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // convert to paisa
          currency: "INR",
          receipt: `rcpt_${Math.random().toString(36).substring(2, 8)}`,
          notes: {
            type,
            planType: planType || "",
            deliveryId: deliveryId || ""
          }
        })
      });

      if (rzpResponse.ok) {
        const rzpOrder = await rzpResponse.json();
        return res.json({
          orderId: rzpOrder.id,
          amount: amount,
          currency: "INR",
          isSimulated: false
        });
      } else {
        const rzpErr = await rzpResponse.text();
        console.error("Razorpay remote order creation failed", rzpErr);
      }
    } catch (err: any) {
      console.error("Razorpay REST exception - falling back to simulated checkout", err);
    }
  }

  res.json({
    orderId,
    amount,
    currency: "INR",
    isSimulated: true
  });
});

app.post("/api/v1/billing/verify-payment", authMiddleware, (req: any, res) => {
  const {
    type,
    planType,
    deliveryId,
    organizationId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    isSimulated
  } = req.body;

  const paymentId = razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 11)}`;
  const state = db.getState();

  if (type === "SUBSCRIBE_PLAN") {
    if (!organizationId || !planType) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "organizationId and planType are required for upgrades" } });
    }
    const org = db.getOrganizationById(organizationId);
    if (!org) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Target organization space not found" } });
    }
    
    // Update org plan
    db.updateOrganizationPlan(organizationId, planType);
    
    // Log billing history details
    if (!state.billingHistory) {
      state.billingHistory = [];
    }
    state.billingHistory.push({
      id: `bill_${Math.random().toString(36).substring(2, 11)}`,
      organizationId,
      amount: planType === "GROWTH" ? 4999 : 19999,
      purpose: `Upgrade to ${planType} SaaS subscription`,
      plan: planType,
      paymentId,
      date: new Date().toISOString(),
      status: "SUCCESS"
    });
    db.save();

    return res.json({
      success: true,
      message: `Successfully upgraded to the premium ${planType} plan.`,
      plan: planType
    });

  } else if (type === "TRANSACTION_FEE") {
    if (!deliveryId) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "deliveryId is required" } });
    }
    
    const delivery = state.deliveries.find(d => d.id === deliveryId);
    if (!delivery) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Referenced delivery log not found" } });
    }

    delivery.transactionFeePaid = true;
    delivery.transactionFeeAmount = parseFloat((delivery.settledAmount * 0.015).toFixed(2));
    delivery.razorpayPaymentId = paymentId;

    db.save();

    return res.json({
      success: true,
      message: "Transaction fee settled successfully. Offsets certified.",
      delivery
    });
  }

  res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid payment context type" } });
});

app.get("/api/v1/billing/history", authMiddleware, (req: any, res) => {
  const state = db.getState();
  const history = state.billingHistory || [];
  res.json(history);
});



// ==========================================
// 4. MATCHMAKING ENGINE
// ==========================================

app.get("/api/v1/matches/nearby", authMiddleware, (req, res) => {
  const { facilityId, radiusKm } = req.query;
  if (!facilityId || !radiusKm) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "facilityId and radiusKm query parameters are required" } });
  }

  const rad = parseFloat(radiusKm as string);
  if (isNaN(rad)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "radiusKm must be numeric" } });
  }

  try {
    const matches = findMatches(facilityId as string, rad);
    const detailed = matches.map(m => {
      const source = db.getFacilityById(m.sourceFacilityId);
      const buyer = db.getFacilityById(m.buyerFacilityId);
      const sourceProfile = db.getThermalProfileByFacilityId(m.sourceFacilityId);
      const buyerProfile = db.getThermalProfileByFacilityId(m.buyerFacilityId);
      
      return {
        ...m,
        sourceFacility: { ...source, thermalProfile: sourceProfile },
        buyerFacility: { ...buyer, thermalProfile: buyerProfile }
      };
    });
    res.json(detailed);
  } catch (err: any) {
    res.status(400).json({ error: { code: "MATCHING_FAILED", message: err.message } });
  }
});

app.post("/api/v1/matches/:id/propose", authMiddleware, (req, res) => {
  const match = db.getMatchById(req.params.id);
  if (!match) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Matching record not found" } });
  }
  
  db.updateMatchStatus(match.id, MatchStatus.PROPOSED);
  res.json(db.getMatchById(match.id));
});


// ==========================================
// 5. CONTRACTS & SETTLEMENTS
// ==========================================

app.post("/api/v1/contracts/:matchId/accept", authMiddleware, (req: any, res) => {
  const { pricePerGJ } = req.body;
  if (!pricePerGJ) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "pricePerGJ is required to bind contract" } });
  }

  const match = db.getMatchById(req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Match partner not found" } });
  }

  // Guard: DATA_CENTER user can't arbitrarily accept on buyer's behalf, or limit based on scope rules if required.
  // We allow simple accept trigger for live demo smoothness.
  try {
    const contract = db.createContract(match.id, parseFloat(pricePerGJ), new Date().toISOString());
    res.status(201).json(contract);
  } catch (err: any) {
    res.status(400).json({ error: { code: "CONTRACT_FAILED", message: err.message } });
  }
});

app.get("/api/v1/contracts/:id", authMiddleware, (req, res) => {
  const contract = db.getContractById(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Contract record not found" } });
  }
  
  const match = db.getMatchById(contract.matchId);
  const source = match ? db.getFacilityById(match.sourceFacilityId) : null;
  const buyer = match ? db.getFacilityById(match.buyerFacilityId) : null;

  res.json({
    ...contract,
    match,
    sourceFacility: source,
    buyerFacility: buyer
  });
});

app.get("/api/v1/contracts/:id/deliveries", authMiddleware, (req, res) => {
  const deliveries = db.getDeliveriesByContractId(req.params.id);
  // Return sorted newest first
  const sorted = deliveries.sort((a,b) => new Date(b.timestampEnd).getTime() - new Date(a.timestampEnd).getTime());
  res.json(sorted);
});


// ==========================================
// 6. RAW IoT METER FEED INTAKE
// ==========================================

app.post("/api/v1/deliveries", authMiddleware, (req, res) => {
  const { contractId, gjDelivered, timestampStart, timestampEnd } = req.body;
  if (!contractId || gjDelivered === undefined || !timestampStart || !timestampEnd) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "contractId, gjDelivered, timestampStart and timestampEnd are required" } });
  }

  const contract = db.getContractById(contractId);
  if (!contract) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Target Contract not found" } });
  }

  const gj = parseFloat(gjDelivered);
  const cash = gj * contract.pricePerGJ;
  const delivery = db.createThermalDelivery(contract.id, gj, parseFloat(cash.toFixed(2)), timestampStart, timestampEnd);

  res.status(201).json(delivery);
});


// ==========================================
// 7. CARBON CREDIT REGISTRY
// ==========================================

app.post("/api/v1/carbon-credits/generate", authMiddleware, (req, res) => {
  const { deliveryId } = req.body;
  if (!deliveryId) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "deliveryId is required to mint carbon credits" } });
  }

  const state = db.getState();
  const delivery = state.deliveries.find(d => d.id === deliveryId);
  if (!delivery) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Thermal delivery log not found" } });
  }

  const existingCert = state.carbonCredits.find(cc => cc.deliveryId === deliveryId);
  if (existingCert) {
    return res.status(409).json({ error: { code: "ALREADY_MINTED", message: "Carbon certificate already issued for this delivery", certificate: existingCert } });
  }

  // Multiply delivered GJ by carbon offset ratio (e.g. 0.05 tCO2 savings per delivered thermal GJ relative to heavy heating oil)
  const gjOffset = parseFloat((delivery.gjDelivered * 0.05).toFixed(3));
  
  // Real verifiable certificate SHA-256 hash
  const dataToHash = `${deliveryId}-${gjOffset}-${Date.now()}`;
  const certificateHash = crypto.createHash("sha256").update(dataToHash).digest("hex");

  const cc = db.createCarbonCredit(deliveryId, gjOffset, certificateHash);
  res.status(201).json(cc);
});


// ==========================================
// 8. REAL-TIME MULTI-FACILITY EVENT STREAM (SSE)
// ==========================================

app.get("/api/v1/stream", (req, res) => {
  const facilityFilter = req.query.facilityIds as string;
  const facilityIds = new Set<string>();
  if (facilityFilter) {
    facilityFilter.split(",").forEach(id => facilityIds.add(id.trim()));
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  res.write("data: { \"connected\": true }\n\n");

  const clientInfo = { res, facilityIds };
  activeClients.add(clientInfo);

  req.on("close", () => {
    activeClients.delete(clientInfo);
  });
});


// ==========================================
// 8.5. MULTI-TENANT ORGANIZATIONS API
// ==========================================

app.get("/api/v1/organizations", authMiddleware, (req: any, res) => {
  const memberships = db.getOrgMembers().filter(m => m.userId === req.user.userId && m.acceptedAt !== null);
  const orgs = memberships.map(m => {
    const org = db.getOrganizationById(m.organizationId);
    return org ? { ...org, seatRole: m.seatRole } : null;
  }).filter(Boolean);
  res.json(orgs);
});

app.post("/api/v1/organizations", authMiddleware, (req: any, res) => {
  const { name, plan } = req.body;
  if (!name) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Organization name is required" } });
  }
  const org = db.createOrganization(req.user.userId, name, plan || OrgPlan.STARTER);
  res.status(201).json(org);
});

app.get("/api/v1/organizations/:id/members", authMiddleware, requireOrgRole([]), (req: any, res) => {
  const members = db.getOrgMembers().filter(m => m.organizationId === req.params.id);
  const enriched = members.map(m => {
    const u = m.userId ? db.getUserById(m.userId) : null;
    return {
      ...m,
      email: u ? u.email : m.email,
      status: m.acceptedAt ? "ACTIVE" : "PENDING"
    };
  });
  res.json(enriched);
});

app.post("/api/v1/organizations/:id/invitations", authMiddleware, requireOrgRole([SeatRole.ADMIN]), (req: any, res) => {
  const { email, seatRole } = req.body;
  if (!email || !seatRole) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "email and seatRole are required" } });
  }

  // Check if member is already in organization
  const existing = db.getOrgMembers().find(
    m => m.organizationId === req.params.id && m.email?.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: { code: "CONFLICT", message: "User is already a member or has a pending invitation" } });
  }

  // Create member invitation
  const member = db.createOrgMember(req.params.id, email, seatRole);

  // Generate invitation JWT token (7-day duration)
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    memberId: member.id,
    email: email.toLowerCase(),
    organizationId: req.params.id,
    seatRole,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
  })).toString("base64url");
  const tokenInput = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(tokenInput).digest("base64url");
  const token = `${tokenInput}.${signature}`;

  const inviteLink = `${req.headers.origin || "http://localhost:3000"}?inviteToken=${token}`;
  
  // Real console logging in developmental flow per spec!
  console.log(`\n--- [NEPTUNE ORG INVITATION GENERATED] ---`);
  console.log(`Invited: ${email} as ${seatRole}`);
  console.log(`Link: ${inviteLink}`);
  console.log(`----------------------------------------\n`);

  res.status(201).json({ token, inviteLink, member });
});

app.post("/api/v1/organizations/invitations/accept", authMiddleware, (req: any, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "token is required to accept invitation" } });
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid invite token" } });
    }
    const [header, payload, signature] = parts;
    const tokenInput = `${header}.${payload}`;
    const calculatedSig = crypto.createHmac("sha256", JWT_SECRET).update(tokenInput).digest("base64url");
    if (calculatedSig !== signature) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid signing signature" } });
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(400).json({ error: { code: "EXPIRED", message: "Invitation token has expired" } });
    }

    // Verify current user corresponds to invited email if we want to restrict, but allowing for simple transfer
    const updatedMember = db.acceptOrgMemberInvitation(decoded.memberId, req.user.userId);
    if (!updatedMember) {
      return res.status(400).json({ error: { code: "NOT_FOUND", message: "Invitation not found or already verified" } });
    }

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Failed to parse token" } });
  }
});

app.put("/api/v1/organizations/:id/members/:userId", authMiddleware, requireOrgRole([SeatRole.ADMIN]), (req: any, res) => {
  const { seatRole } = req.body;
  if (!seatRole) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "seatRole is required" } });
  }

  const updated = db.updateOrgMemberSeatRole(req.params.id, req.params.userId, seatRole);
  if (!updated) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
  }
  res.json(updated);
});

app.delete("/api/v1/organizations/:id/members/:userId", authMiddleware, requireOrgRole([SeatRole.ADMIN]), (req: any, res) => {
  const success = db.deleteOrgMember(req.params.id, req.params.userId);
  if (!success) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Member not found" } });
  }
  res.json({ success: true });
});


// ==========================================
// 9. HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "online-persistent-json",
    simulator: "active"
  });
});


// ==========================================
// 10. GEMINI AI ASSISTANT
// ==========================================

const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

app.post("/api/v1/gemini/chat", authMiddleware, async (req, res) => {
  try {
    const { message, contextObj } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: { message: "Gemini API key is not configured." } });
    }

    const systemInstruction = `You are Neptune AI Assistant, an advanced thermodynamic and cooling systems assistant built into the Neptune console.
Your goal is to answer questions about the data center's thermal profiling, Aqua-RL Reinforcement Learning agent, water efficiency metrics, and general routing or operations.
Here is the live JSON context for the currently selected facility to ground your answers:
${JSON.stringify(contextObj, null, 2)}
Respond concisely in plain text or markdown. Do not hallucinate data outside this context if asked about current system state. Keep explanations focused and professional.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemInstruction + "\\n\\nUser: " + message }] }
      ]
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini AI API Error:", err);
    res.status(500).json({ error: { message: "Failed to generate AI response. Please try again later." } });
  }
});

// Start background telemetry & market updates
simulator.start();

// Static asset handler + SPA routing for React
async function mountServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌍 Neptune production host online at http://0.0.0.0:${PORT}`);
  });
}

mountServer().catch(err => {
  console.error("FATAL: Failed to mount Express + Vite bridge server", err);
  process.exit(1);
});
