/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rodstar: {
          navy: '#0B192C',
          slate: '#1E293B',
          dark: '#0A0F1D',
          emerald: '#10B981',
          accent: '#059669',
          light: '#F8FAFC',
          card: '#111E33',
          border: '#1E2E48',
        }
      }
    },
  },
  plugins: [],
}
