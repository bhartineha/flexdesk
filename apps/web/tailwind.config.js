/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7ff",
          200: "#b8d0ff",
          300: "#8ab0ff",
          400: "#5a8bff",
          500: "#3466f6",
          600: "#254bd6",
          700: "#1f3cab",
          800: "#1e3487",
          900: "#1c2f6b",
        },
      },
    },
  },
  plugins: [],
};
