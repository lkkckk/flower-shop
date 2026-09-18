export type Role = 'admin' | 'staff' | 'cashier'
const all: Role[] = ['admin', 'staff', 'cashier']
const managers: Role[] = ['admin', 'staff']
export const permissions: Record<string, Role[]> = {
  'read.catalog': all, 'read.sales': all, 'read.settings': all, 'read.operations': managers,
  'customer.create': all, 'customer.edit': managers, 'customer.money': managers,
  'catalog.write': ['admin'], 'order.checkout': all, 'order.collect': all,
  'order.adjust.request': all, 'order.adjust.approve': managers, 'order.discount': managers,
  'preorder.write': all, 'stock.write': managers,
  'notification.write': all, 'admin': ['admin'],
}
export const can = (role: string, action: string) => permissions[action]?.includes(role as Role) ?? false
export function routeAction(method: string, path: string): string | null {
  if (method === 'GET') {
    if (path === '/api/stocks/stocktake/summary') return 'read.catalog'
    if (/^\/api\/(products|categories)(\/[^/]+)?$/.test(path)) return 'read.catalog'
    if (/^\/api\/(customers|orders|preorder-registrations|notifications)(\/[^/]+){0,3}$/.test(path)) return 'read.sales'
    if (/^\/api\/preorders(\/(upcoming|\d+))?$/.test(path)) return 'read.sales'
    if (/^\/api\/(settings|promotions|loyalty-rules)(\/[^/]+)?$/.test(path)) return 'read.settings'
    if (/^\/api\/(stocks|reports|payments)(\/[^/]+){0,3}$/.test(path)) return 'read.operations'
    if (/^\/api\/users(\/[^/]+){0,2}$/.test(path)) return 'admin'
  }
  if (method === 'POST' && path === '/api/customers') return 'customer.create'
  if (/^\/api\/customers\/\d+\/(repay|recharge)$/.test(path) && method === 'POST') return 'customer.money'
  if (/^\/api\/customers\/\d+\/(points|adjust|merge)$/.test(path)) return 'admin'
  if (/^\/api\/customers\/\d+(\/(contacts|events|tags|profile)(\/\d+)?)?$/.test(path)) return 'customer.edit'
  if (/^\/api\/(products|categories|promotions)(\/[^/]+){0,2}$/.test(path)) return 'catalog.write'
  if (method === 'POST' && ['/api/orders/checkout','/api/orders/quote'].includes(path)) return 'order.checkout'
  if (method === 'POST' && /^\/api\/orders\/\d+\/(payments|repay)$/.test(path)) return 'order.collect'
  if (method === 'POST' && /^\/api\/orders\/\d+\/adjustments$/.test(path)) return 'order.adjust.request'
  if (method === 'POST' && /^\/api\/orders\/\d+\/adjustments\/\d+\/approve$/.test(path)) return 'order.adjust.approve'
  if (path === '/api/orders/bulk-tag') return 'preorder.write'
  if (/^\/api\/(preorders|preorder-registrations)\/\d+\/(trash|restore)$/.test(path)) return 'admin'
  if (/^\/api\/preorder-registrations(\/\d+)?$/.test(path) || path === '/api/preorder-registrations/images') return 'preorder.write'
  if (path === '/api/preorders/images') return 'preorder.write'
  if (/^\/api\/stocks(\/[^/]+){0,3}$/.test(path)) return 'stock.write'
  if (/^\/api\/notifications(\/\d+\/read|\/mark-all-read)$/.test(path)) return 'notification.write'
  if (/^\/api\/(settings|users|notifications\/regenerate)(\/[^/]+){0,2}$/.test(path)) return 'admin'
  return null
}
