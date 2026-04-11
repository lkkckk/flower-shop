<template>
  <div class="print-page">
    <div v-if="!statement" class="loading-state">
      <p>正在加载对账单...</p>
    </div>

    <div v-else class="statement">
      <!-- 标题 -->
      <div class="header">
        <div class="shop-name">{{ shopName }}</div>
        <div class="subtitle">客户对账单</div>
      </div>

      <!-- 客户信息 -->
      <table class="info-table">
        <tbody>
          <tr>
            <th>客户姓名</th>
            <td>{{ statement.customer.name }}</td>
            <th>手机号</th>
            <td>{{ statement.customer.phone || '—' }}</td>
          </tr>
          <tr>
            <th>客户等级</th>
            <td>{{ getLevelName(statement.customer.level) }}</td>
            <th>对账期间</th>
            <td>{{ formatDate(statement.startDate) }} 至 {{ formatDate(statement.endDate) }}</td>
          </tr>
          <tr>
            <th>地址</th>
            <td colspan="3">{{ statement.customer.address || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 期初余额 -->
      <div class="opening-row">
        <span>期初欠款：</span>
        <span class="amount">¥{{ statement.openingBalance.toFixed(2) }}</span>
      </div>

      <!-- 明细表格 -->
      <table class="detail-table">
        <thead>
          <tr>
            <th style="width: 130px;">日期</th>
            <th style="width: 60px;">类型</th>
            <th style="width: 110px;">单号</th>
            <th>摘要</th>
            <th style="width: 100px;" class="text-right">金额</th>
            <th style="width: 110px;" class="text-right">累计欠款</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, idx) in lines" :key="idx">
            <td>{{ formatDateTime(line.date) }}</td>
            <td>{{ line.kind === 'order' ? '订单' : '收款' }}</td>
            <td class="mono">{{ line.refNo }}</td>
            <td>{{ line.summary }}</td>
            <td class="text-right" :class="line.amount > 0 ? 'plus' : line.amount < 0 ? 'minus' : ''">
              <template v-if="line.amount > 0">+¥{{ line.amount.toFixed(2) }}</template>
              <template v-else-if="line.amount < 0">-¥{{ Math.abs(line.amount).toFixed(2) }}</template>
              <template v-else>¥0.00</template>
            </td>
            <td class="text-right">¥{{ line.runningBalance.toFixed(2) }}</td>
          </tr>
          <tr class="footer-row">
            <td colspan="5" class="text-right"><b>期末欠款合计</b></td>
            <td class="text-right"><b>¥{{ statement.summary.closingBalance.toFixed(2) }}</b></td>
          </tr>
        </tbody>
      </table>

      <!-- 汇总 -->
      <table class="summary-table">
        <tbody>
          <tr>
            <th>期间销售</th>
            <td>¥{{ statement.summary.totalSales.toFixed(2) }}</td>
            <th>已收金额</th>
            <td>¥{{ statement.summary.totalPaid.toFixed(2) }}</td>
            <th>新增欠款</th>
            <td>¥{{ statement.summary.totalOwed.toFixed(2) }}</td>
          </tr>
          <tr>
            <th>还款金额</th>
            <td>¥{{ statement.summary.totalRepay.toFixed(2) }}</td>
            <th>期末欠款</th>
            <td colspan="3"><b>¥{{ statement.summary.closingBalance.toFixed(2) }}</b></td>
          </tr>
        </tbody>
      </table>

      <!-- 签字区 -->
      <div class="signature">
        <div>客户签字：______________</div>
        <div>对账日期：{{ todayStr }}</div>
        <div>店铺签字：______________</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { buildStatementLines, formatDate, formatDateTime } from '~/composables/useStatement'

definePageMeta({ layout: false })
useHead({ title: '打印对账单' })

const route = useRoute()
const router = useRouter()

const shopName = '鲜花批发店'
const todayStr = dayjs().format('YYYY-MM-DD')

const statement = ref<any | null>(null)
const lines = ref<any[]>([])

const getLevelName = (level: string) => {
  const map: Record<string, string> = { normal: '普通', member: '会员', vip: 'VIP', wholesale: '批发' }
  return map[level] || level
}

const loadStatement = async () => {
  const customerId = Number(route.params.customerId)
  const startDate = route.query.startDate as string
  const endDate = route.query.endDate as string

  if (!customerId || !startDate || !endDate) {
    return
  }

  try {
    const res: any = await $fetch('/api/payments/statement', {
      query: { customerId, startDate, endDate },
    })
    if (res.error) return
    statement.value = res.data
    lines.value = buildStatementLines(
      res.data.orders,
      res.data.payments,
      res.data.openingBalance
    )
  } catch (e) {
    // ignore
  }
}

onMounted(async () => {
  await loadStatement()
  if (!statement.value) return
  await nextTick()
  // 延迟一点确保样式渲染完成
  setTimeout(() => {
    try {
      window.print()
    } catch {
      // ignore
    }
  }, 500)

  // 监听打印对话框关闭，尝试回退
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('print')
    const onChange = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setTimeout(() => {
          if (window.history.length > 1) {
            router.back()
          } else {
            window.close()
          }
        }, 300)
        mql.removeEventListener?.('change', onChange)
      }
    }
    mql.addEventListener?.('change', onChange)
  }
})
</script>

<style>
@page {
  size: A4;
  margin: 1.5cm;
}

html, body {
  background: #fff;
  color: #000;
  margin: 0;
  padding: 0;
}

.print-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
  font-family: "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif;
  font-size: 12pt;
  color: #000;
}

.loading-state {
  text-align: center;
  padding: 100px 0;
  color: #888;
}

.header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #000;
}

.shop-name {
  font-size: 22pt;
  font-weight: bold;
  letter-spacing: 4px;
}

.subtitle {
  font-size: 14pt;
  margin-top: 6px;
  color: #555;
}

.info-table,
.detail-table,
.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.info-table th,
.info-table td,
.detail-table th,
.detail-table td,
.summary-table th,
.summary-table td {
  border: 1px solid #333;
  padding: 6px 8px;
  font-size: 11pt;
}

.info-table th,
.summary-table th {
  background: #f5f5f5;
  width: 80px;
  text-align: left;
  font-weight: 600;
}

.opening-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #f5f5f5;
  border: 1px solid #333;
}

.opening-row .amount {
  font-size: 14pt;
  font-weight: bold;
}

.detail-table thead th {
  background: #eee;
  font-weight: 600;
}

.detail-table .footer-row {
  background: #f5f5f5;
}

.detail-table .text-right,
.summary-table .text-right {
  text-align: right;
}

.detail-table .mono {
  font-family: Consolas, monospace;
  font-size: 10pt;
}

.detail-table .plus {
  color: #c00;
}

.detail-table .minus {
  color: #080;
}

.signature {
  margin-top: 48px;
  display: flex;
  justify-content: space-between;
  font-size: 11pt;
}

@media print {
  .print-page {
    padding: 0;
  }
}
</style>
