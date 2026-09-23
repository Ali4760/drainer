// tailwind.config.cjs
module.exports = {
  content: ['./src/client/**/*.{html,tsx,ts,js,jsx}'],
  darkMode: 'class', // enable class strategy for dark mode
  theme: {
    extend: {
      colors: {
        primary: '#0ea5e9', // sky-500
        accent: '#6366f1', // indigo-500
      },
    },
  },
  plugins: [],
};
