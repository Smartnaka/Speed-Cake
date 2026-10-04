import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Modern luxury confectionery palette
        canvas: {
          DEFAULT: '#FAF8F5',
          subtle: '#F4EFEB',
          card: '#FFFFFF',
          dark: '#161312',
        },
        espresso: {
          DEFAULT: '#1E1917',
          deep: '#141110',
          hover: '#2D2623',
        },
        berry: {
          DEFAULT: '#933D32',
          hover: '#7E342B',
          light: '#F8ECE9',
          border: '#E8D4CF',
        },
        caramel: {
          DEFAULT: '#B87B44',
          light: '#FAF2EA',
        },
        sand: {
          DEFAULT: '#EAE3DC',
          light: '#F5EFE9',
          border: '#DFD7CF',
        },
        body: {
          heading: '#1A1615',
          text: '#4A4340',
          muted: '#7A726D',
          light: '#A39993',
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
      },
      boxShadow: {
        'subtle': '0 2px 8px -2px rgba(30, 25, 23, 0.04), 0 1px 2px -1px rgba(30, 25, 23, 0.03)',
        'card': '0 8px 24px -4px rgba(30, 25, 23, 0.06), 0 2px 6px -1px rgba(30, 25, 23, 0.04)',
        'card-hover': '0 16px 36px -6px rgba(30, 25, 23, 0.1), 0 4px 12px -2px rgba(30, 25, 23, 0.06)',
        'modal': '0 24px 60px -12px rgba(30, 25, 23, 0.2)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
