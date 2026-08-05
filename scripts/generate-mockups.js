const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "products");
fs.mkdirSync(dir, { recursive: true });

const packs = [
  { slug: "animes", title: "ANIMES", accent: "#ff3b12", tone: "#1b1b1b", motif: "anime" },
  { slug: "filmes", title: "FILMES", accent: "#f2c14e", tone: "#141820", motif: "film" },
  { slug: "futebol", title: "FUTEBOL", accent: "#2ecc71", tone: "#102016", motif: "ball" },
  { slug: "jogos", title: "JOGOS", accent: "#4cc9f0", tone: "#10161f", motif: "pad" },
  { slug: "religiao", title: "RELIGIÃO", accent: "#e8d5a3", tone: "#1a1712", motif: "cross" },
  { slug: "rock", title: "ROCK", accent: "#ff6b6b", tone: "#160f12", motif: "bolt" },
  { slug: "streetwear", title: "STREETWEAR", accent: "#a3ff12", tone: "#121212", motif: "tag" },
];

function dots(seed, color) {
  let out = "";
  for (let y = 40; y < 760; y += 18) {
    for (let x = 30; x < 610; x += 18) {
      const n = ((x * 17 + y * 31 + seed * 13) % 100) / 100;
      if (n > 0.45) {
        const r = 1.2 + n * 2.4;
        out += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.15 + n * 0.35).toFixed(2)}"/>`;
      }
    }
  }
  return out;
}

function motif(kind, accent) {
  if (kind === "anime") {
    return `<ellipse cx="320" cy="360" rx="90" ry="110" fill="none" stroke="${accent}" stroke-width="10"/>
      <circle cx="290" cy="340" r="10" fill="${accent}"/><circle cx="350" cy="340" r="10" fill="${accent}"/>
      <path d="M285 400 Q320 430 355 400" fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (kind === "film") {
    return `<rect x="220" y="280" width="200" height="180" rx="8" fill="none" stroke="${accent}" stroke-width="10"/>
      <rect x="245" y="305" width="150" height="90" fill="${accent}" opacity="0.25"/>
      <circle cx="250" cy="430" r="12" fill="${accent}"/><circle cx="390" cy="430" r="12" fill="${accent}"/>`;
  }
  if (kind === "ball") {
    return `<circle cx="320" cy="360" r="95" fill="none" stroke="${accent}" stroke-width="10"/>
      <path d="M320 265 L360 320 L340 390 L300 390 L280 320 Z" fill="none" stroke="${accent}" stroke-width="6"/>`;
  }
  if (kind === "pad") {
    return `<rect x="210" y="300" width="220" height="130" rx="36" fill="none" stroke="${accent}" stroke-width="10"/>
      <circle cx="270" cy="365" r="18" fill="${accent}"/><rect x="340" y="345" width="50" height="40" rx="8" fill="${accent}"/>`;
  }
  if (kind === "cross") {
    return `<path d="M320 270 V450 M250 340 H390" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>`;
  }
  if (kind === "bolt") {
    return `<path d="M350 250 L270 380 H330 L290 470 L390 330 H330 Z" fill="${accent}"/>`;
  }
  return `<rect x="230" y="300" width="180" height="140" rx="4" fill="none" stroke="${accent}" stroke-width="10"/>
    <text x="320" y="385" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="42" fill="${accent}">CX</text>`;
}

function cover(pack, variant = 0) {
  const shift = variant * 40;
  const accent = pack.accent;
  const tone = pack.tone;
  const label = variant === 0 ? "PACK DIGITAL" : variant === 1 ? "HALFTONE SET" : "PREVIEW";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800" role="img" aria-label="Pack ${pack.title}">
  <defs>
    <linearGradient id="g${pack.slug}${variant}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tone}"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>
  </defs>
  <rect width="640" height="800" fill="url(#g${pack.slug}${variant})"/>
  <rect x="24" y="24" width="592" height="752" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  ${dots(11 + variant * 7, accent)}
  <g transform="translate(0,${shift * 0.2})">
    ${motif(pack.motif, accent)}
  </g>
  <text x="48" y="90" fill="rgba(255,255,255,0.55)" font-family="Arial, sans-serif" font-size="16" letter-spacing="4">${label}</text>
  <text x="48" y="620" fill="#fff" font-family="Arial Black, Helvetica, sans-serif" font-size="64" letter-spacing="-2">${pack.title}</text>
  <text x="48" y="670" fill="${accent}" font-family="Arial, sans-serif" font-size="22" font-weight="700">100 ARTES · HALFTONE</text>
  <text x="48" y="730" fill="rgba(255,255,255,0.45)" font-family="Arial, sans-serif" font-size="16">CRIATIVARTS</text>
  <rect x="480" y="700" width="112" height="36" fill="${accent}"/>
  <text x="536" y="723" text-anchor="middle" fill="#111" font-family="Arial Black, sans-serif" font-size="14">DIGITAL</text>
</svg>`;
}

for (const pack of packs) {
  fs.writeFileSync(path.join(dir, `${pack.slug}.svg`), cover(pack, 0));
  fs.writeFileSync(path.join(dir, `${pack.slug}-2.svg`), cover(pack, 1));
  fs.writeFileSync(path.join(dir, `${pack.slug}-3.svg`), cover(pack, 2));
}

console.log(`Generated ${packs.length * 3} mockups in ${dir}`);
