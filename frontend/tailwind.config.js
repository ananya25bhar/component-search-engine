// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        secondary: "#f1f5f9",
        accent: "#f1f5f9",
        destructive: "#ef4444",
        muted: "#f1f5f9",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      boxShadow: {
        card: "0 4px 8px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [], // no DaisyUI
}