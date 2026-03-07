/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'system-ui',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0)' },
          '70%':  { transform: 'scale(1.08)' },
          '80%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
