import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

export default defineNuxtPlugin(() => {
  dayjs.locale('zh-cn')
})
