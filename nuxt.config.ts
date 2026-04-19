// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false, // 内部管理系统不需要 SSR，SPA 模式彻底消除样式闪烁
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  modules: [
    '@ant-design-vue/nuxt',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  // Ant Design Vue 按需引入配置
  antd: {
    extractStyle: true, // 避免 SSR 样式闪烁
  },

  // Tailwind CSS 配置
  tailwindcss: {
    exposeConfig: false,
  },

  // TypeScript 严格模式
  typescript: {
    strict: true,
    typeCheck: false, // 开发时关闭以提升速度，CI 中可开启
  },

  // Nitro：为 /api/** 开启 CORS，供微信小程序/小程序 H5 预览跨域调用
  nitro: {
    routeRules: {
      '/api/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Max-Age': '86400',
        },
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
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap',
        },
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
