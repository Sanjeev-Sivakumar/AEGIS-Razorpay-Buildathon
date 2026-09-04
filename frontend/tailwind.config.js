/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        aegis: {
          bg: "#0B0F17",
          card: "#111827",
          border: "#1E293B",
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          violet: "#8B5CF6",
        }
      }
    },
  },
  plugins: [],
}
