/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
        },
        brand: {
          600: "rgb(var(--brand-600) / <alpha-value>)",
          500: "rgb(var(--brand-500) / <alpha-value>)",
          400: "rgb(var(--brand-400) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
        },
        scale: {
          1: "#e0564b",
          2: "#e8935a",
          3: "#e0b84b",
          4: "#8fbf5a",
          5: "#4fa870",
        },
        surface: "rgb(var(--surface) / <alpha-value>)",
        night: "rgb(var(--night) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 23, 28, 0.06), 0 1px 1px rgba(20, 23, 28, 0.04)",
        "card-hover": "0 4px 14px rgba(20, 23, 28, 0.10)",
        panel: "-8px 0 30px rgba(20, 23, 28, 0.10)",
      },
    },
  },
  plugins: [],
};
