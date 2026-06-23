/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pea: {
          light: '#7B2CBF',
          DEFAULT: '#5A189A',
          dark: '#3C096C',
        }
      }
    },
  },
  plugins: [],
}
