/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // support class-based dark mode
  theme: {
    extend: {
      colors: {
        darkBg: '#09090b',      // Very deep charcoal / dark panel background
        darkCard: '#18181b',    // Muted dark card panels
        darkBorder: '#27272a',  // Subtle zinc borders
        neonLime: '#a3e635',    // High energy lime green
        neonCyan: '#06b6d4',    // Modern cyber cyan
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
