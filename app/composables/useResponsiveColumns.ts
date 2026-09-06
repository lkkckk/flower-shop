import { useMediaQuery } from '@vueuse/core'

/** On phones, fixed name/action columns leave no space to read the other fields. */
export function useResponsiveColumns() {
  const phone = useMediaQuery('(max-width: 767px)')
  return <T extends { fixed?: unknown }>(columns: T[]): T[] => phone.value
    ? columns.map(column => ({ ...column, fixed: undefined }))
    : columns
}
