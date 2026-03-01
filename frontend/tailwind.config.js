/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'lcars-black': '#000000',
        'lcars-orange': '#FF9900',
        'lcars-tan': '#FFCC99',
        'lcars-pink': '#CC99CC',
        'lcars-blue': '#9999FF',
        'lcars-red': '#CC6666',
        'lcars-gray': '#999999',
        'lcars-pale-yellow': '#FFFF99',
        'lcars-dark-blue': '#4455FF',
        'lcars-violet': '#9977AA',
      },
      fontFamily: {
        'lcars': ['Antonio', 'sans-serif'],
        'lcars-body': ['Roboto Condensed', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 0.8s steps(20) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
