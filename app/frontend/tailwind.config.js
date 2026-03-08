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
          'Söhne',
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
      colors: {
        oai: {
          bg:           '#0d0d0d',
          surface:      '#161616',
          'surface-2':  '#1c1c1c',
          hover:        '#212121',
          border:       '#2a2a2a',
          'border-2':   '#383838',
          text:         '#ececec',
          muted:        '#8e8ea0',
          subtle:       '#666680',
          green:        '#10a37f',
          'green-hover':'#0d8c6d',
          'green-dim':  '#0e7063',
          red:          '#ef4444',
          'red-dim':    'rgba(239,68,68,0.15)',
          'green-dim2': 'rgba(16,163,127,0.15)',
        },
      },
      borderRadius: {
        'oai': '8px',
        'oai-lg': '12px',
        'oai-xl': '16px',
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0)' },
          '70%':  { transform: 'scale(1.08)' },
          '80%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pop: 'pop 0.3s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
