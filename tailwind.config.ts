import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#e9efff",
          200: "#cfdcff",
          300: "#a8c0ff",
          400: "#7e9fff",
          500: "#5b7cfa",
          600: "#4c62e9",
          700: "#3f4ecf",
          800: "#3742a7",
          900: "#323f85"
        }
      },
      boxShadow: {
        soft: "0 12px 30px -16px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
