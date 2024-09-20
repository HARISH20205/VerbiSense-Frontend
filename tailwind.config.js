/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        logoutColor: "#d04449",
      },
      screens: {
        xxs: "500px",
        xs: "560px",
      },
    },
  },
  plugins: [],
};
