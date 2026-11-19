import type * as THREE_NS from "three";

type Three = typeof THREE_NS;

type Emblem = { type: "star" | "circle"; color: string; r?: number };
type FlagDef = {
  code: string;
  stripes: string[];
  dir: "h" | "v"; // h = horizontal bands, v = vertical bands
  emblem?: Emblem;
  custom?: "us" | "gb";
};

/**
 * Flags are drawn on a canvas, so there are no image downloads and no CORS issues.
 * Add more by pushing to this array. Stripes are equal width.
 */
export const FLAGS: FlagDef[] = [
  { code: "NG", stripes: ["#008751", "#ffffff", "#008751"], dir: "v" },
  { code: "GH", stripes: ["#CE1126", "#FCD116", "#006B3F"], dir: "h", emblem: { type: "star", color: "#111111" } },
  { code: "CM", stripes: ["#007A5E", "#CE1126", "#FCD116"], dir: "v", emblem: { type: "star", color: "#FCD116" } },
  { code: "US", stripes: [], dir: "h", custom: "us" },
  { code: "GB", stripes: [], dir: "h", custom: "gb" },
  { code: "FR", stripes: ["#0055A4", "#ffffff", "#EF4135"], dir: "v" },
  { code: "IT", stripes: ["#009246", "#ffffff", "#CE2B37"], dir: "v" },
  { code: "DE", stripes: ["#111111", "#DD0000", "#FFCE00"], dir: "h" },
  { code: "IE", stripes: ["#169B62", "#ffffff", "#FF883E"], dir: "v" },
  { code: "NL", stripes: ["#AE1C28", "#ffffff", "#21468B"], dir: "h" },
  { code: "RU", stripes: ["#ffffff", "#0039A6", "#D52B1E"], dir: "h" },
  { code: "ML", stripes: ["#14B53A", "#FCD116", "#CE1126"], dir: "v" },
  { code: "SN", stripes: ["#00853F", "#FDEF42", "#E31B23"], dir: "v", emblem: { type: "star", color: "#00853F" } },
  { code: "CI", stripes: ["#F77F00", "#ffffff", "#009E60"], dir: "v" },
  { code: "GN", stripes: ["#CE1126", "#FCD116", "#009460"], dir: "v" },
  { code: "SL", stripes: ["#1EB53A", "#ffffff", "#0072C6"], dir: "h" },
  { code: "BE", stripes: ["#111111", "#FDDA24", "#EF3340"], dir: "v" },
  { code: "PL", stripes: ["#ffffff", "#DC143C"], dir: "h" },
  { code: "UA", stripes: ["#0057B7", "#FFD700"], dir: "h" },
  { code: "RO", stripes: ["#002B7F", "#FCD116", "#CE1126"], dir: "v" },
  { code: "HU", stripes: ["#CE2939", "#ffffff", "#477050"], dir: "h" },
  { code: "AT", stripes: ["#ED2939", "#ffffff", "#ED2939"], dir: "h" },
  { code: "BG", stripes: ["#ffffff", "#00966E", "#D62612"], dir: "h" },
  { code: "LT", stripes: ["#FDB913", "#006A44", "#C1272D"], dir: "h" },
  { code: "ID", stripes: ["#CE1126", "#ffffff"], dir: "h" },
  { code: "JP", stripes: ["#ffffff"], dir: "h", emblem: { type: "circle", color: "#BC002D" } },
  { code: "BD", stripes: ["#006A4E"], dir: "h", emblem: { type: "circle", color: "#F42A41", r: 0.28 } },
];

const W = 256;
const H = 160;

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawUS(ctx: CanvasRenderingContext2D) {
  const stripeH = H / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#B22234" : "#ffffff";
    ctx.fillRect(0, i * stripeH, W, stripeH + 1);
  }
  ctx.fillStyle = "#3C3B6E";
  ctx.fillRect(0, 0, W * 0.4, stripeH * 7);
  ctx.fillStyle = "#ffffff";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      ctx.beginPath();
      ctx.arc(14 + col * 19, 12 + row * 19, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGB(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#012169";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, H);
  ctx.moveTo(W, 0); ctx.lineTo(0, H);
  ctx.stroke();
  ctx.strokeStyle = "#C8102E";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(W, H);
  ctx.moveTo(W, 0); ctx.lineTo(0, H);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(W / 2 - 22, 0, 44, H);
  ctx.fillRect(0, H / 2 - 22, W, 44);
  ctx.fillStyle = "#C8102E";
  ctx.fillRect(W / 2 - 13, 0, 26, H);
  ctx.fillRect(0, H / 2 - 13, W, 26);
}

export function makeFlagTexture(THREE: Three, flag: FlagDef) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  if (flag.custom === "us") drawUS(ctx);
  else if (flag.custom === "gb") drawGB(ctx);
  else {
    const n = flag.stripes.length;
    flag.stripes.forEach((c, i) => {
      ctx.fillStyle = c;
      if (flag.dir === "v") ctx.fillRect((W / n) * i, 0, W / n + 1, H);
      else ctx.fillRect(0, (H / n) * i, W, H / n + 1);
    });
    if (flag.emblem) {
      ctx.fillStyle = flag.emblem.color;
      if (flag.emblem.type === "star") star(ctx, W / 2, H / 2, H * 0.24);
      else {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, H * (flag.emblem.r ?? 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // subtle edge so white flags stay visible on the dark background
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Stylised ocean + graticule, shown until (or if) /textures/earth.jpg loads. */
export function makeFallbackEarth(THREE: Three) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#0b2a55");
  g.addColorStop(0.5, "#0e4a7a");
  g.addColorStop(1, "#0b2a55");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "rgba(142,227,214,0.35)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
