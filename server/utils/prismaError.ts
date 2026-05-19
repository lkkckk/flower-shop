import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library'

export interface MappedError {
  /**
   * 建议的 HTTP 状态码：
   * - 200：业务错误（通过 envelope 返回），不要 setResponseStatus
   * - 404：资源不存在
   * - 500：服务器内部错误
   */
  status: number
  /** 业务错误码（前端可据此分流 UI） */
  code: string
  /** 友好中文消息 */
  message: string
}

/**
 * 把 Prisma 抛出的异常映射成项目统一的错误对象。
 *
 * - P2002 唯一约束冲突 → 业务错误（200）
 * - P2003 外键约束冲突 → 业务错误（200，说明存在关联数据）
 * - P2025 记录不存在 → 404
 * - 其余已知错误 / 未知错误 → 500
 */
export function handlePrismaError(error: unknown, fallbackMessage = '操作失败'): MappedError {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta as { target?: unknown })?.target
        const field = Array.isArray(target) ? target.join('、') : (typeof target === 'string' ? target : '字段')
        return {
          status: 200,
          code: 'UNIQUE_CONFLICT',
          message: `${field} 已存在，请检查输入`,
        }
      }
      case 'P2003':
        return {
          status: 200,
          code: 'FK_CONSTRAINT',
          message: '存在关联数据，无法删除或修改',
        }
      case 'P2025':
        return {
          status: 200,
          code: 'NOT_FOUND',
          message: '记录不存在或已被删除',
        }
      default:
        return {
          status: 500,
          code: 'DB_ERROR',
          message: '数据库操作失败',
        }
    }
  }

  if (error instanceof PrismaClientValidationError) {
    return {
      status: 200,
      code: 'VALIDATION_ERROR',
      message: '请求参数不合法',
    }
  }

  // 业务代码主动 throw new Error('xxx') 的情况：保留 message
  if (error instanceof Error && error.message) {
    return {
      status: 200,
      code: 'BUSINESS_ERROR',
      message: error.message,
    }
  }

  return {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: fallbackMessage,
  }
}

/**
 * 便捷封装：在 catch 块中使用。
 * 自动 setResponseStatus（仅当非 200 时），并返回标准 envelope。
 */
export function respondWithPrismaError(event: any, error: unknown, fallbackMessage = '操作失败') {
  const mapped = handlePrismaError(error, fallbackMessage)
  if (mapped.status !== 200) {
    setResponseStatus(event, mapped.status)
  }
  return {
    data: null,
    error: { code: mapped.code, message: mapped.message },
  }
}
