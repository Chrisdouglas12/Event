/**
 * Lightweight API hardening for sensitive endpoints.
 *
 * - Blocks IPs listed in SECURITY_BLOCKED_IPS (exact IP or IPv4/IPv6 CIDR).
 * - Scores violations and temporarily blocks repeat offenders in memory.
 * - Applies per-endpoint rate limits backed by Upstash when configured, with a
 *   safe in-process fallback for single-instance deployments.
 */
import net from "node:net";
import type { NextFunction, Request, Response } from "express";
import { clientIp, rateLimit } from "./rate-limit.ts";

type ViolationRecord = {
  score: number;
  firstAt: number;
  blockedUntil: number;
  reasons: string[];
};

type BlockInfo = {
  blocked: boolean;
  permanent?: boolean;
  retryAfterSeconds?: number;
};

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const VIOLATION_THRESHOLD = positiveInt(process.env.SECURITY_VIOLATION_THRESHOLD, 6);
const VIOLATION_WINDOW_MS = positiveInt(process.env.SECURITY_VIOLATION_WINDOW_MS, 30 * 60_000);
const BLOCK_DURATION_MS = positiveInt(process.env.SECURITY_BLOCK_DURATION_MS, 24 * 60 * 60_000);
const BLOCK_PRIVATE_IPS = process.env.SECURITY_BLOCK_PRIVATE_IPS === "true";

const STATIC_BLOCKS = (process.env.SECURITY_BLOCKED_IPS || "")
  .split(/[,\n\r]+/)
  .map((entry) => entry.trim())
  .filter(Boolean);

const violations = new Map<string, ViolationRecord>();

function normaliseIp(value: string): string {
  let ip = String(value || "").trim();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  ip = ip.split("%")[0];
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip.toLowerCase();
}

function ipv4BigInt(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0n;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function ipv6Groups(ip: string): string[] | null {
  const [left = "", right = ""] = ip.split("::", 2);
  const leftGroups = left ? left.split(":") : [];
  const rightGroups = right ? right.split(":") : [];
  const missing = 8 - leftGroups.length - rightGroups.length;
  if (missing < 0) return null;

  const expand = (group: string): string[] => {
    if (!group.includes(".")) return [group];
    const octets = group.split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return [];
    }
    return [
      ((octets[0] << 8) | octets[1]).toString(16),
      ((octets[2] << 8) | octets[3]).toString(16),
    ];
  };

  const groups = [
    ...leftGroups.flatMap(expand),
    ...Array.from({ length: missing }, () => "0"),
    ...rightGroups.flatMap(expand),
  ];
  return groups.length === 8 ? groups : null;
}

function ipToBigInt(value: string): { value: bigint; bits: number } | null {
  const ip = normaliseIp(value);
  const family = net.isIP(ip);
  if (family === 4) {
    const parsed = ipv4BigInt(ip);
    return parsed === null ? null : { value: parsed, bits: 32 };
  }
  if (family === 6) {
    const groups = ipv6Groups(ip);
    if (!groups) return null;
    let parsed = 0n;
    for (const group of groups) {
      const part = Number.parseInt(group || "0", 16);
      if (!Number.isFinite(part) || part < 0 || part > 0xffff) return null;
      parsed = (parsed << 16n) | BigInt(part);
    }
    return { value: parsed, bits: 128 };
  }
  return null;
}

function matchesBlock(ip: string, entry: string): boolean {
  const candidate = normaliseIp(ip);
  const rule = normaliseIp(entry);
  if (!candidate || !rule) return false;

  if (!rule.includes("/")) return candidate === rule;

  const [base, bitsRaw] = rule.split("/");
  const bits = Number(bitsRaw);
  const target = ipToBigInt(candidate);
  const network = ipToBigInt(base);
  if (!target || !network || target.bits !== network.bits) return false;
  if (!Number.isInteger(bits) || bits < 0 || bits > network.bits) return false;

  const width = BigInt(network.bits);
  const prefix = BigInt(bits);
  const mask = prefix === 0n ? 0n : ((1n << prefix) - 1n) << (width - prefix);
  return (target.value & mask) === (network.value & mask);
}

function isPrivateIp(ip: string): boolean {
  const value = normaliseIp(ip);
  if (!value || value === "unknown" || value === "0.0.0.0" || value === "::1") return true;
  if (value.startsWith("127.") || value.startsWith("10.") || value.startsWith("192.168.")) return true;
  if (value.startsWith("169.254.")) return true;
  if (value.startsWith("172.")) {
    const second = Number(value.split(".")[1]);
    if (Number.isInteger(second) && second >= 16 && second <= 31) return true;
  }
  if (value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:")) return true;
  return false;
}

/** Returns true when the IP was newly blocked by this violation. */
export function recordViolation(ip: string, reason: string, weight = 1): boolean {
  const value = normaliseIp(ip);
  if (!value || value === "unknown") return false;
  if (isPrivateIp(value) && !BLOCK_PRIVATE_IPS) return false;

  const now = Date.now();
  let record = violations.get(value);
  if (!record || record.firstAt + VIOLATION_WINDOW_MS <= now || record.blockedUntil <= now) {
    record = { score: 0, firstAt: now, blockedUntil: 0, reasons: [] };
  }

  record.score += Math.max(1, Math.floor(weight));
  record.reasons = [...new Set([...record.reasons.slice(-4), reason])];

  if (record.score >= VIOLATION_THRESHOLD) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    violations.set(value, record);
    console.warn(`[security] blocked IP ${value} after violations: ${record.reasons.join(", ")}`);
    return true;
  }

  violations.set(value, record);
  return false;
}

/** Convenience helper for routes that want to score a specific failure. */
export function markViolation(req: Request, reason: string, weight = 1): boolean {
  return recordViolation(clientIp(req), reason, weight);
}

export function blockInfo(ip: string): BlockInfo {
  const value = normaliseIp(ip);
  if (value && STATIC_BLOCKS.some((entry) => matchesBlock(value, entry))) {
    return { blocked: true, permanent: true };
  }

  const record = violations.get(value);
  if (record && record.blockedUntil > Date.now()) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - Date.now()) / 1000)),
    };
  }
  return { blocked: false };
}

function blockedResponse(info: BlockInfo, res: Response) {
  if (typeof info.retryAfterSeconds === "number") {
    res.setHeader("Retry-After", String(info.retryAfterSeconds));
  }
  return res.status(403).json({
    error: info.permanent
      ? "Access denied from this network."
      : "Access temporarily blocked because of suspicious activity. Please try again later.",
  });
}

/** Drop known attackers and temporarily banned violators before routing. */
export function ipFirewall(req: Request, res: Response, next: NextFunction) {
  const info = blockInfo(clientIp(req));
  if (info.blocked) return blockedResponse(info, res);
  return next();
}

/** Cheap security headers for the JSON API. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  return next();
}

export interface SensitiveLimitOptions {
  name: string;
  limit: number;
  windowMs: number;
  /** Optional extra key component, e.g. the submitted username. */
  key?: (req: Request) => string;
  /** Score a failed response with the given weight. */
  failureWeights?: Partial<Record<number, number>>;
  violationWeight?: number;
}

/**
 * Rate limit + violation scoring for one endpoint group. Reaching the limit
 * adds a violation; repeat offenders are blocked by ipFirewall.
 */
export function rateLimitSensitive(options: SensitiveLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = clientIp(req);
      const info = blockInfo(ip);
      if (info.blocked) return blockedResponse(info, res);

      const extra = options.key?.(req) || "";
      const result = await rateLimit(`${options.name}:${ip}:${extra}`, options.limit, options.windowMs);
      res.setHeader("X-RateLimit-Limit", String(options.limit));
      res.setHeader("X-RateLimit-Remaining", String(result.remaining));

      if (!result.allowed) {
        const newlyBlocked = recordViolation(ip, `rate_limit:${options.name}`, options.violationWeight ?? 2);
        if (newlyBlocked) return blockedResponse(blockInfo(ip), res);
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({ error: "Too many requests. Please slow down and try again." });
      }

      if (options.failureWeights) {
        res.once("finish", () => {
          const weight = options.failureWeights?.[res.statusCode];
          if (weight) recordViolation(ip, `${options.name}:${res.statusCode}`, weight);
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
