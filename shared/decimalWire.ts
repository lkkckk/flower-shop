import { decimal } from './money'
const scales: Record<string, number> = {"defaultPrice": 2, "memberPrice": 2, "vipPrice": 2, "wholesalePrice": 2, "toBaseQty": 3, "qty": 3, "specialPrice": 2, "specialQty": 3, "inboundQty": 3, "currentQty": 3, "costPrice": 2, "qtyChange": 3, "storedValueBalance": 2, "receivableBalance": 2, "creditLimit": 2, "balance": 2, "totalOwed": 2, "threshold": 2, "reduction": 2, "refundedAmount": 2, "pointsDiscount": 2, "totalAmount": 2, "paidAmount": 2, "owedAmount": 2, "discountRate": 2, "returnedQty": 3, "baseQty": 3, "unitPrice": 2, "originalPrice": 2, "subtotal": 2, "amount": 2, "balanceAfter": 2, "unitCost": 2, "totalCost": 2, "receivedQty": 3, "openingCash": 2, "expectedCash": 2, "countedCash": 2, "variance": 2, "totalSales": 2, "totalPaid": 2, "totalBalance": 2, "totalSpent": 2, "grossProfit": 2, "avgOrderValue": 2, "openingBalance": 2, "closingBalance": 2, "totalRepay": 2, "currentStock": 3, "profit": 2, "currentExpected": 2, "selectedAmount": 2, "totalStock": 3}
export function decimalWire(value: any, numeric = false, key = ''): any {
  if (Array.isArray(value)) return value.map(x => decimalWire(x, numeric))
  if (value instanceof Date) return value
  if (value && typeof value === 'object') {
    const result: any = {}
    for (const [k, v] of Object.entries(value)) {
      // Point balances and list counts are integers, not currency.
      const pointRow = 'availablePoints' in value && !('name' in value) || ('sourceKey' in value && 'balanceAfter' in value && !('account' in value))
      result[k] = pointRow && ['amount', 'balanceAfter'].includes(k) ? Number(v) : decimalWire(v, numeric, k)
    }
    return result
  }
  if (value !== null && value !== '' && scales[key] !== undefined && (typeof value === 'number' || typeof value === 'string') && /^-?\d+(\.\d+)?$/.test(String(value))) {
    return numeric ? Number(value) : decimal(value).toFixed(scales[key])
  }
  return value
}
