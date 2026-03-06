/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F1F3D',
          green: '#1A6B45',
          light: '#F7F6F3',
          border: '#E8E4DE'
        }
      }
    },
  },
  plugins: [],
}