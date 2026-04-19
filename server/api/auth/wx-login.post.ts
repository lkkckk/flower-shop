import { signToken } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

interface JsCode2SessionResponse {
  openid?: string
  session_key?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

/**
 * 小程序微信登录
 * 请求：{ code, userInfo?: { nickName, avatarUrl } }
 * 流程：wx.login -> code -> 后端用 code 换取 openid -> 建立/查询 Customer -> 下发 JWT
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    code?: string
    userInfo?: { nickName?: string; avatarUrl?: string }
  }>(event)

  const code = (body?.code || '').trim()
  if (!code) {
    return { data: null, error: { message: '缺少 code 参数', code: 'BAD_PARAMS' } }
  }

  const appid = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_SECRET

  let openid = ''
  let unionid: string | undefined

  if (!appid || !secret) {
    // 开发环境降级：允许用固定 code "dev-<xxx>" 直接创建测试用户
    if (code.startsWith('dev-')) {
      openid = code
      console.warn('[wx-login] 使用开发模式假 openid:', openid)
    } else {
      return {
        data: null,
        error: { message: '后端未配置微信小程序凭证 (WECHAT_APPID/WECHAT_SECRET)', code: 'WECHAT_NOT_CONFIGURED' },
      }
    }
  } else {
    // 正常调用微信 jscode2session
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
      const resp = await $fetch<JsCode2SessionResponse>(url)
      if (resp.errcode) {
        return {
          data: null,
          error: {
            message: `微信登录失败: ${resp.errmsg || 'unknown'}`,
            code: `WX_${resp.errcode}`,
          },
        }
      }
      openid = resp.openid || ''
      unionid = resp.unionid
    } catch (e: any) {
      return { data: null, error: { message: '调用微信接口失败', code: 'WX_REQUEST_FAILED' } }
    }
  }

  if (!openid) {
    return { data: null, error: { message: '未能获取 openid', code: 'NO_OPENID' } }
  }

  // 查/建 Customer
  let customer = await prisma.customer.findUnique({ where: { openid } })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: body?.userInfo?.nickName || '微信用户',
        level: 'normal',
        openid,
        unionid,
        nickname: body?.userInfo?.nickName,
        avatarUrl: body?.userInfo?.avatarUrl,
      },
    })
  } else if (body?.userInfo) {
    // 更新昵称/头像（如果客户端传了）
    const patch: any = {}
    if (body.userInfo.nickName && body.userInfo.nickName !== customer.nickname) {
      patch.nickname = body.userInfo.nickName
    }
    if (body.userInfo.avatarUrl && body.userInfo.avatarUrl !== customer.avatarUrl) {
      patch.avatarUrl = body.userInfo.avatarUrl
    }
    if (Object.keys(patch).length > 0) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: patch })
    }
  }

  const token = signToken({ sub: customer.id, type: 'customer' })

  return {
    data: {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        level: customer.level,
        balance: customer.balance,
        points: customer.points,
        nickname: customer.nickname,
        avatarUrl: customer.avatarUrl,
      },
    },
    error: null,
  }
})
