import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // In the manner of Brandon Grotesque, visitor's typeface: Josefin Sans
        // for headings and labels, Mulish to read. Both self-hosted (fontsource).
        display: ['"Josefin Sans Variable"', '"Josefin Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Mulish Variable"', 'Mulish', 'system-ui', 'sans-serif'],
      },
      colors: {
        // The public site: white, harbour navy, sea and a warm coral for what to notice.
        harbour: '#0f2a44',
        // Headings: 80% grey.
        ink: '#333333',
        sea: '#1f6f8b',
        coral: '#d9542f',
      },
    },
  },
  plugins: [],
} satisfies Config;
