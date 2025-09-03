/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'notion-gray': {
          50: '#f7f7f5',
          100: '#e9e9e7',
          200: '#d3d3d0',
          300: '#b8b8b5',
          400: '#a8a8a3',
          500: '#9b9b95',
          600: '#8d8d85',
          700: '#7c7c75',
          800: '#69695f',
          900: '#55544e',
        }
      },
      fontFamily: {
        'ui-sans-serif': ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', '"Apple Color Emoji"', 'Arial', 'sans-serif', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
      },
      spacing: {
        '18': '4.5rem',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}