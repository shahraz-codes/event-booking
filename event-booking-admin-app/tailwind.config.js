/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef7ee",
          100: "#fdecd7",
          200: "#fad5ae",
          300: "#f6b67a",
          400: "#f08c44",
          500: "#ec6f20",
          600: "#dd5616",
          700: "#b74014",
          800: "#923418",
          900: "#762d16",
        },
      },
    },
  },
  plugins: [],
};
