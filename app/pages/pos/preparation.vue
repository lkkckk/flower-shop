<template>
  <PreparationBoard compact />
</template>

<script setup lang="ts">
import PreparationBoard from '~~/components/orders/PreparationBoard.vue'

definePageMeta({ layout: 'pos' })
useHead({ title: 'POS 今日备货 - 花店管理系统' })
</script>
