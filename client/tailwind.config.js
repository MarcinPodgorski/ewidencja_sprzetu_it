/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        // Miękki, lekko „zabarwiony” cień zamiast szarego — cieplejszy odbiór kart.
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(79 70 229 / 0.18)',
        'soft-lg': '0 2px 4px rgb(15 23 42 / 0.05), 0 18px 40px -16px rgb(79 70 229 / 0.30)',
      },
      keyframes: {
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'spin-in': {
          '0%': { opacity: '0', transform: 'rotate(-120deg) scale(0.5)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
        // Bardzo powolny dryf rozmytych plam koloru w tle.
        aurora: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(6%, -4%, 0) scale(1.1)' },
          '100%': { transform: 'translate3d(-4%, 5%, 0) scale(0.95)' },
        },
      },
      // Wejścia z `backwards`, nie `both`: po zakończeniu animacja nie może trzymać
      // `transform: none`, bo zablokowałaby transformacje z hovera (np. uniesienie kafelka).
      animation: {
        'page-in': 'page-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in': 'fade-in 0.2s ease-out backwards',
        'modal-in': 'modal-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'spin-in': 'spin-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        pop: 'pop 0.25s ease-out',
        aurora: 'aurora 24s ease-in-out infinite alternate',
        'aurora-slow': 'aurora 32s ease-in-out infinite alternate-reverse',
      },
    },
  },
  plugins: [],
};
