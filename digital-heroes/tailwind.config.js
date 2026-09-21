/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: { DEFAULT: '#1D1237', soft: '#2A1D4D', line: '#3B2C66' },
        paper: { DEFAULT: '#F4F3FA', deep: '#E7E5F2' },
        bloom: { DEFAULT: '#E8467C', dark: '#C9316A' },
        lagoon: { DEFAULT: '#0FA596', dark: '#0B7F73' },
        sun: '#FFC145',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        drop: {
          '0%': { transform: 'translateY(-40px) scale(.6)', opacity: '0' },
          '60%': { transform: 'translateY(6px) scale(1.05)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        drop: 'drop .7s cubic-bezier(.2,.8,.2,1) both',
        fadeIn: 'fadeIn .5s ease-out both',
      },
    },
  },
  plugins: [],
};
