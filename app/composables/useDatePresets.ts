import dayjs, { type Dayjs } from 'dayjs'

/**
 * 通用日期快捷预设，供订单 / 客户 / 库存 / 报表 等列表页统一调用
 *
 * 用法：
 *   const { presets, applyPreset } = useDatePresets()
 *   // 模板里 <a-button v-for="p in presets" :key="p.key" @click="dateRange = applyPreset(p.key)">{{ p.label }}</a-button>
 *
 * 也可与 ant-design-vue 的 RangePicker 自带的 `:presets` 属性配合使用。
 */
export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'last7Days'
  | 'last30Days'

export interface DatePresetItem {
  key: DatePresetKey
  label: string
}

export const DATE_PRESET_LIST: DatePresetItem[] = [
  { key: 'today', label: '今天' },
  { key: 'yesterday', label: '昨天' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'thisQuarter', label: '本季度' },
  { key: 'last7Days', label: '近 7 天' },
  { key: 'last30Days', label: '近 30 天' },
]

function rangeFor(key: DatePresetKey): [Dayjs, Dayjs] {
  switch (key) {
    case 'today':
      return [dayjs().startOf('day'), dayjs().endOf('day')]
    case 'yesterday': {
      const d = dayjs().subtract(1, 'day')
      return [d.startOf('day'), d.endOf('day')]
    }
    case 'thisWeek':
      return [dayjs().startOf('week'), dayjs().endOf('week')]
    case 'thisMonth':
      return [dayjs().startOf('month'), dayjs().endOf('month')]
    case 'lastMonth': {
      const m = dayjs().subtract(1, 'month')
      return [m.startOf('month'), m.endOf('month')]
    }
    case 'thisQuarter':
      return [dayjs().startOf('quarter'), dayjs().endOf('quarter')]
    case 'last7Days':
      return [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')]
    case 'last30Days':
      return [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')]
  }
}

export const useDatePresets = () => {
  const presets = DATE_PRESET_LIST

  /** 返回 dayjs 对象元组，适合给 RangePicker 的 v-model */
  const applyPreset = (key: DatePresetKey): [Dayjs, Dayjs] => rangeFor(key)

  /** 返回 'YYYY-MM-DD' 字符串元组，适合 valueFormat="YYYY-MM-DD" 的场景 */
  const applyPresetAsString = (key: DatePresetKey): [string, string] => {
    const [s, e] = rangeFor(key)
    return [s.format('YYYY-MM-DD'), e.format('YYYY-MM-DD')]
  }

  /** ant-design-vue RangePicker :presets 属性兼容格式 */
  const antdPresets = presets.map((p) => ({
    label: p.label,
    value: rangeFor(p.key),
  }))

  return { presets, applyPreset, applyPresetAsString, antdPresets }
}
