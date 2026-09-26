/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  presets: [require('@omega-os/ui/tailwind.preset.js')],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // OmegaOS component classes come from the linked package dist.
    '../../node_modules/@omega-os/ui/dist/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
