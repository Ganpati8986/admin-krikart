/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#dceeff',
          500: '#1d4ed8',
          600: '#1e40af',
          700: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};
