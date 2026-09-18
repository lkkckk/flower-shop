import { businessHandler } from '../utils/businessTransaction'
import { decimal } from '../../shared/money'
export default businessHandler('loyalty.rules', async (tx, actor, key, b) => {
 const earnPerYuan = decimal(b.earnPerYuan); const pointsPerYuan = decimal(b.pointsPerYuan); const maxPercent = decimal(b.maxPercent)
 if (earnPerYuan.lt(0) || earnPerYuan.gt(100) || !pointsPerYuan.isInteger() || pointsPerYuan.lt(1) || pointsPerYuan.gt(100000) || maxPercent.lt(0) || maxPercent.gt(100)) throw new Error('积分参数超出范围')
 const rules = { earnPerYuan: earnPerYuan.toNumber(), pointsPerYuan: pointsPerYuan.toNumber(), maxPercent: maxPercent.toNumber() }
 await tx.setting.upsert({ where: { key: 'loyaltyRules' }, create: { key: 'loyaltyRules', value: JSON.stringify(rules) }, update: { value: JSON.stringify(rules) } })
 return rules
})
