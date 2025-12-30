// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#e6ebff",
          500: "#00B9E8",
          600: "#0192BF",
          700: "#00758D",
        },
        site: {
          text: '#606060',
          muted: '#a8a8a8',
          light: '#f7f7f8',
          border: '#e6e6e6'
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
