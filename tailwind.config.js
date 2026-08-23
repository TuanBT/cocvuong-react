/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Accent theo trang, dieu khien bang bien CSS (xem index.css)
        accent: {
          50: 'rgb(var(--accent-50) / <alpha-value>)',
          100: 'rgb(var(--accent-100) / <alpha-value>)',
          200: 'rgb(var(--accent-200) / <alpha-value>)',
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
          800: 'rgb(var(--accent-800) / <alpha-value>)',
        },
        // Mau cu cua app, giu lai cho 2 trang giam sat
        'coc-green': '#27ae60',
        'coc-yellow': '#f1c40f',
        'coc-red': '#e74c3c',
        'coc-gray': '#95a5a6',
        'coc-orange': '#e67e22',
        'coc-silver': '#bdc3c7',
        'coc-body-bg': '#ecf0f1',
        'midnight-blue': '#2c3e50',
      },
      // Font dong ho khong khai bao o day: dung class .clock-face trong
      // assets/css/style.css, vi no khoa luon font-weight 400 va tat
      // font-synthesis - clockicons chi co mot do day.
      borderRadius: {
        'card': '1rem',
        'control': '0.75rem',
      },
      boxShadow: {
        'card': '0 1px 2px rgb(15 23 42 / 0.04), 0 10px 24px -14px rgb(15 23 42 / 0.25)',
        'card-hover': '0 2px 4px rgb(15 23 42 / 0.05), 0 16px 32px -16px rgb(15 23 42 / 0.32)',
        'pop': '0 12px 40px -12px rgb(15 23 42 / 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'pop-in': 'pop-in 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
