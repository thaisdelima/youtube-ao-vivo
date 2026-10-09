/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Roboto", "system-ui", "sans-serif"] },
      colors: {
        canvas: "#14100d",
        surface: "#1f1814",
        raised: "#2b221b",
        "raised-hover": "#3a2e24",
        line: "#33291f",
        "line-strong": "#4a3b2d",
        ink: "#f5ede4",
        sand: "#d8cabb",
        muted: "#b8a899",
      },
      screens: { "3xl": "1920px" },
    },
  },
  plugins: [],
};
