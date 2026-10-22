/**
 * Design tokens for places that can't read Tailwind/CSS variables — e.g. Stripe
 * Elements, which renders in an iframe. Keep in sync with @theme in globals.css.
 */
export const THEME = {
  ore: "#f25a00",
  raised: "#1e1e1b",
  cream: "#f0ebe0",
  bg: "#0e0e0c",
  radius: "10px",
} as const;
