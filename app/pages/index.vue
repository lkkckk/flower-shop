<template>
  <div>
    <a-card title="首页" class="page-card">
      <a-empty description="首页仪表盘 — 开发中">
        <template #image>
          <div class="empty-icon">🌸</div>
        </template>
      </a-empty>
    </a-card>
  </div>
</template>

<script setup lang="ts">
useHead({ title: '首页 - 花店管理系统' })
</script>

<style scoped>
.page-card {
  border-radius: 8px;
}

.empty-icon {
  font-size: 64px;
  line-height: 1;
}
</style>
