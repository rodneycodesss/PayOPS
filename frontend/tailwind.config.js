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
          cyan: '#16A6D9',
          cyanHover: '#1392C0',
          dark: '#080D18',
          sidebar: '#080D18',
          bg: '#EEF2F6',
          cardDark: '#0B132B',
          navy: '#0B192C',
          slate: '#1E293B',
          emerald: '#10B981',
          accent: '#16A6D9',
          light: '#F8FAFC',
          border: '#E2E8F0',
        }
      }
    },
  },
  plugins: [],
}
