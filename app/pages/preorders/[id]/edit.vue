<template>
  <div class="p-6 max-w-2xl mx-auto">
    <a-card class="page-card text-center" title="历史预售已归档">
      <a-result
        status="info"
        title="历史预售单不支持在线编辑"
        sub-title="旧版预售订单已进入只读归档状态，保留原始照片与账务流水。如需登记新预售，请前往“预售管理 → 登记记录”新建自由登记。"
      >
        <template #extra>
          <a-space>
            <a-button type="primary" @click="router.push(`/preorders/${$route.params.id}`)">查看只读详情</a-button>
            <a-button @click="router.push('/preorders')">返回预售管理</a-button>
          </a-space>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
useHead({ title: '历史预售已归档 - 花店管理系统' })
</script>
