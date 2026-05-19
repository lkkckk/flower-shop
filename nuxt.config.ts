// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // 内部管理系统不需要 SSR，SPA 模式彻底消除样式闪烁
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  css: ['~/assets/css/main.css'],

  modules: [
    '@ant-design-vue/nuxt',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/google-fonts',
  ],

  // Ant Design Vue 按需引入配置
  antd: {
    extractStyle: true, // 避免 SSR 样式闪烁
  },

  // Tailwind CSS 配置
  tailwindcss: {
    exposeConfig: false,
  },

  // 字体本地化（避开境外 fonts.googleapis.com，在国内 VPS 上避免首屏阻塞）
  googleFonts: {
    families: {
      'Noto Sans SC': [400, 500, 600, 700, 800],
      Outfit: [400, 500, 600, 700, 800],
    },
    download: true,
    inject: true,
    display: 'swap',
  },

  // TypeScript 严格模式
  typescript: {
    strict: true,
    typeCheck: false, // 开发时关闭以提升速度，CI 中可开启
  },

  // Nitro：为 /api/** 开启 CORS，供微信小程序/小程序 H5 预览跨域调用
  nitro: {
    compressPublicAssets: true,
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3000',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Max-Age': '86400',
        },
      },
      '/_nuxt/**': {
        headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      },
      '/images/**': {
        headers: { 'Cache-Control': 'public, max-age=86400' },
      },
    },
  },

  // 应用级配置
  app: {
    head: {
      title: '花店管理系统',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '鲜花批发店进销存 + 收银管理系统' },
      ],
    },
  },

  // Vite 预打包优化
  vite: {
    optimizeDeps: {
      include: [
        '@ant-design/icons-vue',
        'dayjs',
        'dayjs/plugin/weekday',
        'dayjs/plugin/localeData',
        'dayjs/plugin/weekOfYear',
        'dayjs/plugin/weekYear',
        'dayjs/plugin/quarterOfYear',
        'dayjs/plugin/advancedFormat',
        'dayjs/plugin/customParseFormat',
        '@vueuse/core',
      ],
    },
  },
})
