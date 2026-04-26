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
        sans: ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Noto Sans SC', 'Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f2dd',
          100: '#e2e8c8',
          200: '#c7d29f',
          300: '#a8b97f',
          400: '#8aa068',
          500: '#6e8654',
          600: '#5c7148',
          700: '#4f6336',
          800: '#3f4f2a',
          900: '#2e3a1f',
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
        },
        avocado: {
          50: '#f0f2dd',
          100: '#e2e8c8',
          200: '#c7d29f',
          300: '#a8b97f',
          400: '#8aa068',
          500: '#6e8654',
          600: '#5c7148',
          700: '#4f6336',
          800: '#3f4f2a',
          900: '#2e3a1f',
        },
        paper: {
          DEFAULT: '#f5f1e8',
          light: '#faf7ee',
          card: '#fffef7',
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
