import { prisma } from '../utils/prisma'
// Financial services log within their own transaction. This also records successful
// legacy catalogue/settings mutations without recording credentials or upload bytes.
export default defineNitroPlugin(nitro => {
  nitro.hooks.hook('afterResponse', async event => {
    if (!event.path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(event.method) || !event.context.user || event.context.user.type !== 'staff') return
    if (event.node.res.statusCode >= 400 || event.path.startsWith('/api/auth/')) return
    try {
      await prisma.auditLog.create({ data: { action: `${event.method} ${event.path.split('?')[0]}`, entityType: 'Request', entityId: event.path.split('?')[0], operatorUserId: event.context.user.sub, details: { httpStatus: event.node.res.statusCode } } })
    } catch (error) { console.error('[audit] request record failed', error instanceof Error ? error.name : 'unknown') }
  })
})
