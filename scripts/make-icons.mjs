// Renders the PWA / home-screen icons from the brand mark. Run: node scripts/make-icons.mjs
import sharp from "sharp";

const BG = "#0e0e0c";
const ORE = "#f25a00";
const W = `<path d="M12 18h8l5 20 6-20h6l6 20 5-20h8l-9 30h-7l-6-19-6 19h-7z" fill="${ORE}"/>`;
// Rounded tile (regular icons), full-bleed square with the mark inside the 80% safe zone (maskable/apple).
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BG}"/>${W}</svg>`;
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BG}"/><g transform="translate(32 33) scale(0.72) translate(-32 -33)">${W}</g></svg>`;

const out = [
  ["public/icons/icon-192.png", rounded, 192],
  ["public/icons/icon-512.png", rounded, 512],
  ["public/icons/maskable-512.png", fullBleed, 512],
  ["src/app/apple-icon.png", fullBleed, 180],
];
for (const [file, svg, size] of out) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 64 }).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
