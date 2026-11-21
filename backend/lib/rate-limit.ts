import crypto from "node:crypto";
import type { Request } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastSweep >= SWEEP_INTERVAL_MS) {
    lastSweep = now;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const configured = Boolean(
    redisUrl &&
      redisToken &&
      !redisUrl.includes("example.upstash.io") &&
      !redisToken.startsWith("mock_")
  );

  if (!configured) {
    // A missing Redis config must never take the whole API down. The local
    // fixed-window limiter still protects a single backend instance.
    return localRateLimit(key, limit, windowMs);
  }

  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const redisKey = `ihgc:rate:${keyHash}`;
  const script =
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return {n,redis.call('PTTL',KEYS[1])}";

  try {
    const response = await fetch(redisUrl!, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", redisKey, String(windowMs)]),
      signal: AbortSignal.timeout(2_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Rate limit service rejected the request.");
    const body = (await response.json()) as { result?: [number, number]; error?: string };
    if (body.error || !Array.isArray(body.result)) throw new Error("Rate limit service returned an invalid response.");
    const [count, ttlMs] = body.result.map(Number);
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) throw new Error("Invalid rate limit counters.");
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: count <= limit ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  } catch {
    // Redis is an optimization for multi-instance deployments, not a hard
    // dependency. Fall back to the in-process limiter instead of blocking every
    // legitimate request.
    return localRateLimit(key, limit, windowMs);
  }
}

/** Express-compatible client IP reader. Trust proxy is configured in server.ts. */
export function clientIp(req: Request): string {
  const raw = req.ip || req.socket?.remoteAddress || "unknown";
  let ip = String(raw).trim();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip.split("%")[0].toLowerCase();
}
