import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import mongoose from "mongoose";
import dotenv from "dotenv";

// routes
import attendeeRoutes from "./routes/attendees.ts";
import authRoutes from "./routes/auth.ts";
import jobRoutes from "./routes/jobs.ts";
import orderRoutes from "./routes/orders.ts";
import scanRoutes from "./routes/scans.ts";
import settingsRoutes from "./routes/settings.ts";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set");
}

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOUNT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api", attendeeRoutes);
app.use("/api", authRoutes);
app.use("/api", jobRoutes);
app.use("/api", orderRoutes);
app.use("/api", scanRoutes);
app.use("/api", settingsRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler (keep last)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

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