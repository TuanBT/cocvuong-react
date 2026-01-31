/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors from the app
        'coc-green': '#27ae60',
        'coc-yellow': '#f1c40f',
        'coc-red': '#e74c3c',
        'coc-gray': '#95a5a6',
        'coc-orange': '#e67e22',
        'coc-silver': '#bdc3c7',
        'coc-body-bg': '#ecf0f1',
        'midnight-blue': '#2c3e50',
      },
      fontFamily: {
        'clock': ['clockicons', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

