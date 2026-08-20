import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      spacing: {
        "4.5": "1.125rem",
      },
      colors: {
        brand: {
          50: "#f4f6f4",
          100: "#e4ebe5",
          200: "#c8d5c9",
          300: "#a8b8aa",
          400: "#96a597",
          500: "#7d8e7f",
          600: "#6b7f7a",
          700: "#56665f",
          800: "#45524d",
          900: "#38423e",
        },
        sage: {
          50: "#f4f6f4",
          100: "#e4ebe5",
          200: "#c8d5c9",
          300: "#a8b8aa",
          400: "#96a597",
          500: "#7d8e7f",
          600: "#6b7f7a",
          700: "#56665f",
          800: "#45524d",
          900: "#38423e",
        },
        sand: {
          50: "#faf8f4",
          100: "#f0ead8",
          200: "#e4dcc8",
          300: "#d4c59a",
          400: "#c4b6a8",
          500: "#b8a68a",
          600: "#a89578",
          700: "#8a7962",
          800: "#6b5f47",
          900: "#564c38",
        },
        dusty: {
          50: "#f4f6f8",
          100: "#e4eaf0",
          200: "#c8d5de",
          300: "#b0c2ce",
          400: "#a8b8c8",
          500: "#8ea3b5",
          600: "#788ea3",
          700: "#5f7387",
          800: "#4b5c6d",
          900: "#3c4a57",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-ring": "pulseRing 1.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        shimmer: "shimmer 1.5s infinite linear",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "spin-slow": "spin 6s linear infinite",
        "stagger-1": "fadeSlideUp 0.55s 60ms ease-out both",
        "stagger-2": "fadeSlideUp 0.55s 200ms ease-out both",
        "stagger-3": "fadeSlideUp 0.55s 340ms ease-out both",
        "stagger-4": "fadeSlideUp 0.55s 480ms ease-out both",
        "stagger-5": "fadeSlideUp 0.55s 620ms ease-out both",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": {
            transform: "scale(0.85)",
            opacity: "0.75",
            boxShadow: "0 0 0 0 rgba(212,197,154,0.55)",
          },
          "70%": {
            transform: "scale(1.05)",
            opacity: "0",
            boxShadow: "0 0 0 10px rgba(212,197,154,0)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "0",
            boxShadow: "0 0 0 0 rgba(212,197,154,0)",
          },
        },
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
