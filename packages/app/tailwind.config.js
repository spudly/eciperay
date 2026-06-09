/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './App.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'primary': '#6366f1',
        'primary-dark': '#4f46e5',
        'surface': '#ffffff',
        'muted': '#6b7280',
      },
    },
  },
  plugins: [],
};
