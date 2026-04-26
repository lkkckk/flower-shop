<template>
  <ScheduleBoard compact />
</template>

<script setup lang="ts">
import ScheduleBoard from '~~/components/orders/ScheduleBoard.vue'

definePageMeta({ layout: 'pos' })
useHead({ title: 'POS 排单 - 花店管理系统' })
</script>
