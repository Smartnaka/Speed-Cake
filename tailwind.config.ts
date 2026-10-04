import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Vibrant sweet pink confectionery palette inspired by modern cake boutique
        brand: {
          pink: '#E60067',
          pinkHover: '#C70055',
          pinkDark: '#9E0044',
          pinkLight: '#FFF0F5',
          pinkSoft: '#FFF5F8',
          pinkBorder: '#FAD1E0',
          pinkBadge: '#FFE4EE',
          gold: '#FFB800',
        },
        canvas: {
          DEFAULT: '#FFF5F8',
          subtle: '#FDF0F4',
          card: '#FFFFFF',
          dark: '#2A1722',
        },
        espresso: {
          DEFAULT: '#2A1E24',
          deep: '#1D1419',
          hover: '#3D2D35',
        },
        berry: {
          DEFAULT: '#E60067',
          hover: '#C70055',
          light: '#FFF0F5',
          border: '#FAD1E0',
        },
        sand: {
          DEFAULT: '#FAD1E0',
          light: '#FFF0F5',
          border: '#F7C6D7',
        },
        body: {
          heading: '#2A1E24',
          text: '#55424D',
          muted: '#8A7380',
          light: '#B29CA7',
        },
      },
      fontFamily: {
        serif: [
          'Playfair Display',
          'Georgia',
          'Didot',
          'Bodoni MT',
          'serif',
        ],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        handwriting: [
          'Caveat',
          'Dancing Script',
          'Brush Script MT',
          'cursive',
        ],
      },
      boxShadow: {
        'subtle': '0 2px 10px -2px rgba(230, 0, 103, 0.05), 0 1px 3px -1px rgba(42, 30, 36, 0.04)',
        'card': '0 10px 30px -5px rgba(230, 0, 103, 0.08), 0 2px 8px -2px rgba(42, 30, 36, 0.04)',
        'card-hover': '0 20px 40px -6px rgba(230, 0, 103, 0.16), 0 6px 16px -2px rgba(42, 30, 36, 0.06)',
        'pink-glow': '0 8px 24px -2px rgba(230, 0, 103, 0.35)',
        'modal': '0 24px 60px -12px rgba(42, 30, 36, 0.25)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
