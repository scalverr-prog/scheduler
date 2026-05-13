import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./staticServer";

// Anthropic API for voice scribe
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function handleScribeRequest(req: express.Request, res: express.Response) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Missing transcript' });
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a medical scheduling assistant that extracts structured data from voice transcripts.

Given a spoken transcript, extract the following fields if mentioned:
- firstName: Patient's first name
- lastName: Patient's last name
- mrn: Medical Record Number (digits only)
- procedures: Array of procedure types mentioned (LP, BMA, BMBx, IT Chemo, PICC, Central Line, Port Access, Sedated MRI, Colonoscopy, EGD, Bronchoscopy, Biopsy, Infusion, Chemotherapy, Consultation, Follow Up, etc.) - return as JSON array like ["LP", "BMA"]
- date: Date in YYYY-MM-DD format (interpret "today", "tomorrow", "Monday", "October 8th" etc. relative to current date)
- startTime: Time in HH:MM 24-hour format (interpret "8 in the morning" as 08:00, "2pm" as 14:00, etc.)
- service: Medical service (Oncology, Cardiology, Pulmonary, Radiology, Neurology, GI, Orthopedics, Urology, General Surgery, etc.)
- sedationist: Name of sedation provider if mentioned (extract ONLY the person's name like "Ben Cortez", not titles like "intensivist" or "anesthesiologist")
- pmd: Name of attending physician/PMD if mentioned (extract ONLY the person's name, not titles like "doctor" or "oncologist")
- notes: ANY other information mentioned that doesn't fit the above fields (allergies, special instructions, patient conditions, weight, NPO status, IV access, isolation precautions, family contact, transport needs, equipment needed, etc.)

RULES:
1. Only include fields that are EXPLICITLY and CLEARLY spoken - DO NOT guess or infer
2. For procedures: ONLY include if the exact procedure name was clearly said. Do NOT add CT, MRI, or other imaging unless explicitly stated
3. If unsure whether something was said, DO NOT include it
4. Capitalize names properly
5. Calculate actual YYYY-MM-DD from today: ${currentDate}
6. Use 24-hour format HH:MM for times
7. Put ALL extra information in the "notes" field - don't lose any details!
8. Return ONLY valid JSON, no explanation
9. NEVER add "CT" unless the speaker clearly said "CT scan" or "CAT scan"

Example 1: "new procedure for John Smith LP tomorrow at 9am oncology, patient is NPO, allergic to penicillin"
Output: {"firstName":"John","lastName":"Smith","procedures":["LP"],"date":"2026-05-10","startTime":"09:00","service":"Oncology","notes":"NPO, allergic to penicillin"}

Example 2: "LP and BMA for Sarah Jones Monday at 8am"
Output: {"firstName":"Sarah","lastName":"Jones","procedures":["LP","BMA"],"date":"2026-05-12","startTime":"08:00"}

Example 3: "IT chemo and bone marrow aspiration for patient MRN 12345"
Output: {"mrn":"12345","procedures":["IT Chemo","BMA"]}

Example 4: "LP for John Doe tomorrow 8am, intensivist Ben Cortez, oncologist Dr. Smith"
Output: {"firstName":"John","lastName":"Doe","procedures":["LP"],"date":"2026-05-10","startTime":"08:00","sedationist":"Ben Cortez","pmd":"Smith"}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Parse this transcript:\n\n"${transcript}"` }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return res.status(response.status).json({ error: 'Claude API error', details: errorText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    try {
      const parsed = JSON.parse(text);
      return res.json({ success: true, fields: parsed });
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({ success: true, fields: parsed });
        } catch {}
      }
      return res.json({ success: false, error: 'Failed to parse', raw: text });
    }
  } catch (error) {
    console.error('Scribe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Voice scribe API endpoint
  app.post('/api/scribe', handleScribeRequest);

  // Health check endpoint for Azure App Service
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
