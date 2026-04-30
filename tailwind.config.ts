import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jetbrains)"],
        mono: ["var(--font-jetbrains)"],
        serif: ["var(--font-fraunces)"],
      },
      colors: {
        'bg-0': 'var(--bg-0)',
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'line': 'var(--line)',
        'line-soft': 'var(--line-soft)',
        'text-0': 'var(--text-0)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
        'amber': 'var(--amber)',
        'amber-dim': 'var(--amber-dim)',
        'cyan': 'var(--cyan)',
        'cyan-dim': 'var(--cyan-dim)',
        'green': 'var(--green)',
        'green-dim': 'var(--green-dim)',
        'red': 'var(--red)',
        'red-dim': 'var(--red-dim)',
        'magenta': 'var(--magenta)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
