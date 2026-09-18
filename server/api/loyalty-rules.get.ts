import { prisma } from '../utils/prisma'
import { loyaltyRules } from '../utils/accounts'
export default defineEventHandler(async () => ({ data: await loyaltyRules(prisma), error: null }))
