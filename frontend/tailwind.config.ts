import type { Config } from "tailwindcss";

/**
 * The palette is the design brief made literal: vibrant greens for growth, rich
 * earth browns for trust, sunny yellows for optimism, soft sky blues for calm.
 * Every scale runs 50→900 so components lean on the same ramp instead of
 * inventing one-off colours.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f0fdf2",
          100: "#dcfce3",
          200: "#bbf7c9",
          300: "#86efa0",
          400: "#4ade6f",
          500: "#22c34c",
          600: "#16a03a",
          700: "#157e31",
          800: "#16632c",
          900: "#145127",
        },
        earth: {
          50: "#fbf7f1",
          100: "#f5ecdf",
          200: "#ead6bd",
          300: "#dcba93",
          400: "#cc9a68",
          500: "#c1824a",
          600: "#b36e3f",
          700: "#955636",
          800: "#794631",
          900: "#623b2a",
        },
        sunny: {
          50: "#fffceb",
          100: "#fff6c6",
          200: "#ffec88",
          300: "#ffdb4a",
          400: "#ffc720",
          500: "#f9a607",
          600: "#dd7d02",
          700: "#b75706",
          800: "#94430c",
          900: "#7a380d",
        },
        sky: {
          50: "#f0f8ff",
          100: "#e0f0fe",
          200: "#bae2fd",
          300: "#7dcbfc",
          400: "#38b0f8",
          500: "#0e94e9",
          600: "#0275c7",
          700: "#035ea1",
          800: "#075085",
          900: "#0c436e",
        },
        soil: {
          50: "#f7f6f4",
          100: "#e8e5e0",
          200: "#d2ccc3",
          300: "#b4aa9d",
          400: "#968a7a",
          500: "#7d715f",
          600: "#665b4d",
          700: "#544a40",
          800: "#473f38",
          900: "#3e3833",
        },
      },
      fontFamily: {
        // Nunito's rounded terminals match the illustration style; the display
        // face is heavier for headings that must read across a phone screen.
        sans: ["var(--font-nunito)", "ui-rounded", "system-ui", "sans-serif"],
        display: ["var(--font-baloo)", "var(--font-nunito)", "ui-rounded", "sans-serif"],
        accent: ["var(--font-accent)", "Georgia", "serif"],
      },
      borderRadius: {
        cartoon: "1.75rem",
        blob: "2.5rem",
      },
      boxShadow: {
        // Soft, offset shadows read as "sticker on paper" rather than "floating card".
        cartoon: "0 10px 0 -2px rgb(0 0 0 / 0.06), 0 18px 30px -12px rgb(20 81 39 / 0.28)",
        "cartoon-sm": "0 6px 0 -2px rgb(0 0 0 / 0.05), 0 12px 20px -10px rgb(20 81 39 / 0.24)",
        "cartoon-lg": "0 16px 0 -4px rgb(0 0 0 / 0.06), 0 28px 44px -16px rgb(20 81 39 / 0.32)",
        pop: "0 0 0 4px rgb(255 255 255 / 0.9), 0 10px 26px -8px rgb(20 81 39 / 0.4)",
        /* Glass-era additions */
        glass: "0 8px 32px -8px rgb(20 81 39 / 0.12), inset 0 1px 0 0 rgb(255 255 255 / 0.5)",
        "glass-lg": "0 16px 48px -12px rgb(20 81 39 / 0.18), inset 0 1px 0 0 rgb(255 255 255 / 0.5)",
        "glow-leaf": "0 0 20px 4px rgb(34 195 76 / 0.25), 0 0 60px 8px rgb(34 195 76 / 0.08)",
        "glow-sky": "0 0 20px 4px rgb(14 148 233 / 0.2), 0 0 60px 8px rgb(14 148 233 / 0.06)",
        "glow-sunny": "0 0 20px 4px rgb(249 166 7 / 0.2), 0 0 60px 8px rgb(249 166 7 / 0.06)",
        "inner-glow": "inset 0 2px 12px -2px rgb(255 255 255 / 0.4)",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-2.5deg)" },
          "50%": { transform: "rotate(2.5deg)" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "sun-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.06)" },
        },
        "truck-roll": {
          "0%": { transform: "translateX(-6%)" },
          "100%": { transform: "translateX(106%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        /* New premium keyframes */
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px 4px rgb(34 195 76 / 0.2)" },
          "50%": { boxShadow: "0 0 32px 8px rgb(34 195 76 / 0.35)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgb(187 247 201 / 0.6)" },
          "50%": { borderColor: "rgb(134 239 160 / 0.9)" },
        },
        /* Nature-themed keyframes */
        "leaf-fall": {
          "0%": { opacity: "0", transform: "translateY(-20px) rotate(0deg) translateX(0)" },
          "10%": { opacity: "0.7" },
          "100%": { opacity: "0", transform: "translateY(100vh) rotate(720deg) translateX(80px)" },
        },
        "leaf-sway": {
          "0%, 100%": { transform: "rotate(-5deg) translateX(0)" },
          "25%": { transform: "rotate(5deg) translateX(6px)" },
          "50%": { transform: "rotate(-3deg) translateX(-4px)" },
          "75%": { transform: "rotate(4deg) translateX(8px)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(180deg)" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "coin-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "cloud-drift": {
          "0%": { transform: "translateX(-15%)" },
          "100%": { transform: "translateX(115%)" },
        },
        "pin-drop": {
          "0%": { opacity: "0", transform: "translate(-50%, -200%) scale(0.5)" },
          "60%": { opacity: "1", transform: "translate(-50%, -90%) scale(1.1)" },
          "80%": { transform: "translate(-50%, -105%) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, -100%) scale(1)" },
        },
        "sun-rays": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        wiggle: "wiggle 0.5s ease-in-out",
        "float-soft": "float-soft 3.5s ease-in-out infinite",
        "pop-in": "pop-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sun-pulse": "sun-pulse 4s ease-in-out infinite",
        "truck-roll": "truck-roll 9s linear infinite",
        shimmer: "shimmer 1.6s infinite",
        /* New premium animations */
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "scale-in": "scale-in 0.4s ease-out both",
        "gradient-shift": "gradient-shift 8s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
        /* Nature-themed animations */
        "leaf-fall": "leaf-fall 12s linear infinite",
        "leaf-sway": "leaf-sway 6s ease-in-out infinite",
        sparkle: "sparkle 2s ease-in-out infinite",
        "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
        "slide-in-left": "slide-in-left 0.5s ease-out both",
        "slide-in-right": "slide-in-right 0.5s ease-out both",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        "coin-flip": "coin-flip 3s ease-in-out infinite",
        "cloud-drift": "cloud-drift 25s linear infinite",
        "pin-drop": "pin-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sun-rays": "sun-rays 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
