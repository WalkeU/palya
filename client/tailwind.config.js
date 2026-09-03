/** @type {import('tailwindcss').Config} */
export default {
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
          950: "#14171c",
          900: "#1b1f27",
          700: "#3a4150",
          500: "#6b7280",
          300: "#c7cbd1",
          100: "#eef0f3",
          50: "#f7f8fa",
        },
        brand: {
          600: "#2f6f5e",
          500: "#3a8a74",
          400: "#4fa88f",
          100: "#e2f2ec",
        },
        scale: {
          1: "#e0564b",
          2: "#e8935a",
          3: "#e0b84b",
          4: "#8fbf5a",
          5: "#4fa870",
        },
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
