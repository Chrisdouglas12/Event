import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import participantRoutes from "./routes/participants.ts";
import authRoutes from "./routes/auth.ts";
import scanRoutes from "./routes/scans.ts";
import settingsRoutes from "./routes/settings.ts";
import resourceRoutes from "./routes/resources.ts";
import adminRoutes from "./routes/admin.ts";
import {
  ipFirewall,
  rateLimitSensitive,
  securityHeaders,
} from "./lib/security.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Behind a reverse proxy, req.ip must reflect the real client or every user
// would share the proxy's rate-limit bucket. Set TRUST_PROXY=false when the
// backend is exposed directly.
const trustProxy = process.env.TRUST_PROXY;
app.set(
  "trust proxy",
  trustProxy === undefined
    ? 1
    : trustProxy === "false"
      ? false
      : /^\d+$/.test(trustProxy)
        ? Number(trustProxy)
        : trustProxy
);

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

app.use(securityHeaders);
app.use(ipFirewall);

const ALLOWED_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:3000",
  "http://10.117.129.255:3001",
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // allow no-origin (curl, Postman, mobile) + allowed list
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
}));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});


app.use(
  "/api",
  rateLimitSensitive({
    name: "api_global",
    limit: 1_000,
    windowMs: 5 * 60_000,
    violationWeight: 1,
  })
);

app.use(
  "/api/auth/login",
  rateLimitSensitive({
    name: "auth_login",
    limit: 8,
    windowMs: 15 * 60_000,
    key: (req) => String(req.body?.username || "").trim().toLowerCase(),
    failureWeights: { 400: 1, 401: 2, 403: 3 },
    violationWeight: 2,
  })
);
app.use(
  "/api/auth/totp",
  rateLimitSensitive({
    name: "auth_totp",
    limit: 8,
    windowMs: 15 * 60_000,
    failureWeights: { 400: 1, 401: 2, 403: 3 },
    violationWeight: 2,
  })
);
app.use(
  "/api/checkout/initialize",
  rateLimitSensitive({
    name: "checkout_initialize",
    limit: 12,
    windowMs: 10 * 60_000,
    failureWeights: { 400: 1, 409: 1, 503: 1 },
    violationWeight: 2,
  })
);
app.use(
  "/api/checkout/verify",
  rateLimitSensitive({
    name: "checkout_verify",
    limit: 60,
    windowMs: 10 * 60_000,
    violationWeight: 1,
  })
);
app.use(
  "/api/tickets/lookup",
  rateLimitSensitive({
    name: "ticket_lookup",
    limit: 8,
    windowMs: 15 * 60_000,
    key: (req) => String(req.body?.phone || "").replace(/\D/g, "").slice(-10),
    failureWeights: { 400: 2 },
    violationWeight: 2,
  })
);
app.use(
  "/api/admin",
  rateLimitSensitive({
    name: "admin_api",
    limit: 240,
    windowMs: 5 * 60_000,
    failureWeights: { 401: 3, 403: 3 },
    violationWeight: 2,
  })
);
app.use(
  "/api/settings",
  rateLimitSensitive({
    name: "settings_api",
    limit: 120,
    windowMs: 5 * 60_000,
    failureWeights: { 401: 3, 403: 3 },
    violationWeight: 2,
  })
);
app.use(
  "/api/scans",
  rateLimitSensitive({
    name: "scanner_api",
    limit: 400,
    windowMs: 5 * 60_000,
    failureWeights: { 401: 3, 403: 3 },
    violationWeight: 2,
  })
);


app.use("/api", participantRoutes);
app.use("/api", authRoutes);
app.use("/api", scanRoutes);
app.use("/api", settingsRoutes);
app.use("/api", resourceRoutes);
app.use("/api", adminRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler (keep last)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});


async function start() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("MongoDB connected");

  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
