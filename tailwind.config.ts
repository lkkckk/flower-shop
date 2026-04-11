import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,ts,tsx}',
    './components/**/*.{vue,ts,tsx}',
    './layouts/**/*.{vue,ts,tsx}',
    './pages/**/*.{vue,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e5eee5',
          200: '#cddfcb',
          300: '#a8c6a5',
          400: '#7fa67a',
          500: '#60885c',
          600: '#4a6b47',
          700: '#3d563a',
          800: '#324531',
          900: '#2a3929',
        }
      },
    },
  },
  // 避免与 Ant Design Vue 样式冲突
  corePlugins: {
    preflight: false,
  },
  plugins: [],
} satisfies Config
