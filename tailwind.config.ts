import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {colors: {
      brand: "#103249",
      primary: "#629A93",
      accent: "#A6C9C7",
      text: "#558981",
    },
      
      boxShadow: {
        soft: "0 12px 30px -16px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
