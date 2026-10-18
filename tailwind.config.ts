import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      colors: {
        // The public site: harbour navy, sea, sand and a warm coral for what to notice.
        harbour: '#0f2a44',
        sea: '#1f6f8b',
        sand: '#f6f1e9',
        coral: '#d9542f',
      },
    },
  },
  plugins: [],
} satisfies Config;
