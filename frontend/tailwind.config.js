/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['14px', { lineHeight: '1.45', letterSpacing: '-0.01em' }],
        'sm': ['16px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'base': ['18px', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'lg': ['20px', { lineHeight: '1.5', letterSpacing: '-0.015em' }],
        'xl': ['24px', { lineHeight: '1.35', letterSpacing: '-0.02em' }],
        '2xl': ['28px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '3xl': ['36px', { lineHeight: '1.25', letterSpacing: '-0.025em' }],
        '4xl': ['42px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        '5xl': ['54px', { lineHeight: '1.15', letterSpacing: '-0.035em' }],
        '6xl': ['64px', { lineHeight: '1.1', letterSpacing: '-0.04em' }],
      },
      colors: {
        navy: {
          950: '#060D17',
          900: '#0B192C',
          850: '#0F213A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569'
        },
        blood: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        }
      }
    },
  },
  plugins: [],
}
