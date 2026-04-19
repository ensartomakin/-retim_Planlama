import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7c3aed',
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        ink: {
          DEFAULT: '#1f2937',
          2: '#4b5563',
          3: '#9ca3af',
        },
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
        pop: '0 10px 15px -3px rgba(16,24,40,.08), 0 4px 6px -4px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
};

export default config;
