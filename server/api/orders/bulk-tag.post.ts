import { prisma } from '../../utils/prisma'

const parseTags = (value?: string | null) =>
  (value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const serializeTags = (tags: string[]) => Array.from(new Set(tags)).join(',') || null

/**
 * 批量给订单打标签
 *
 * body: { ids: number[], tag: string, mode?: 'append' | 'remove' | 'replace' }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id: any) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)
    : []
  const tag = String(body?.tag || '').trim()
  const mode = ['append', 'remove', 'replace'].includes(body?.mode) ? body.mode : 'append'

  if (ids.length === 0) {
    throw createError({ statusCode: 400, message: '请选择要打标的订单' })
  }
  if (!tag) {
    throw createError({ statusCode: 400, message: '请输入标签' })
  }
  if (tag.includes(',')) {
    throw createError({ statusCode: 400, message: '标签不能包含逗号' })
  }

  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      select: { id: true, tags: true },
    })

    await prisma.$transaction(
      orders.map((order) => {
        const current = parseTags(order.tags)
        let next: string[]
        if (mode === 'replace') next = [tag]
        else if (mode === 'remove') next = current.filter((item) => item !== tag)
        else next = [...current, tag]

        return prisma.order.update({
          where: { id: order.id },
          data: { tags: serializeTags(next) },
        })
      }),
    )

    return { data: { updated: orders.length }, error: null }
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || '批量打标失败', code: 'BULK_TAG_ERROR' },
    }
  }
})
