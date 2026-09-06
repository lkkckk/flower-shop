/** storeName is the key edited in Settings; retain compatibility with older installs. */
export function resolveShopName(settings: Record<string, unknown> = {}) {
  for (const key of ['storeName', 'shopName', 'shop_name']) {
    const value = settings[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return '花店'
}
