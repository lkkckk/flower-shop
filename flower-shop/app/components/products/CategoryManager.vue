<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <span class="text-gray-500 text-sm">支持三级分类，点击"+"新增子分类</span>
      <a-button type="primary" size="small" @click="openAdd(null)" class="bg-pink-500 hover:bg-pink-600 border-none">
        新增一级分类
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <a-tree
        v-if="treeData.length"
        :tree-data="treeData"
        :field-names="{ title: 'name', key: 'id', children: 'children' }"
        default-expand-all
        class="category-tree"
      >
        <template #title="nodeData">
          <div class="flex items-center justify-between w-full group">
            <span>{{ nodeData.name }}</span>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a-button
                v-if="depth(nodeData) < 3"
                type="link"
                size="small"
                class="text-blue-500 p-0 h-auto leading-none"
                @click.stop="openAdd(nodeData.id)"
              >子分类</a-button>
              <a-button
                type="link"
                size="small"
                class="text-gray-500 p-0 h-auto leading-none"
                @click.stop="openEdit(nodeData)"
              >编辑</a-button>
              <a-popconfirm
                title="确定删除该分类吗？（有子分类或商品时不允许删除）"
                ok-text="删除"
                cancel-text="取消"
                @confirm="handleDelete(nodeData.id)"
              >
                <a-button
                  type="link"
                  size="small"
                  danger
                  class="p-0 h-auto leading-none"
                  @click.stop
                >删除</a-button>
              </a-popconfirm>
            </div>
          </div>
        </template>
      </a-tree>
      <a-empty v-else description="暂无分类，请新增" />
    </a-spin>

    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑分类' : (parentId ? '新增子分类' : '新增一级分类')"
      @ok="handleSave"
      @cancel="modalVisible = false"
      :confirm-loading="saving"
      ok-text="保存"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="分类名称" required>
          <a-input v-model:value="form.name" placeholder="请输入分类名称" autofocus />
        </a-form-item>
        <a-form-item label="排序（数值越小越靠前）">
          <a-input-number v-model:value="form.sort" :min="0" class="w-full" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'

const loading = ref(false)
const saving = ref(false)
const treeData = ref<any[]>([])
const modalVisible = ref(false)
const editingId = ref<number | null>(null)
const parentId = ref<number | null>(null)
const form = ref({ name: '', sort: 0 })

const fetchCategories = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/categories')
    treeData.value = res.data || []
  } finally {
    loading.value = false
  }
}

const depth = (node: any): number => {
  if (!node.parentId) return 1
  const findDepth = (nodes: any[], id: number, d: number): number => {
    for (const n of nodes) {
      if (n.id === id) return d
      if (n.children?.length) {
        const found = findDepth(n.children, id, d + 1)
        if (found > 0) return found
      }
    }
    return 0
  }
  return findDepth(treeData.value, node.id, 1)
}

const openAdd = (pid: number | null) => {
  editingId.value = null
  parentId.value = pid
  form.value = { name: '', sort: 0 }
  modalVisible.value = true
}

const openEdit = (node: any) => {
  editingId.value = node.id
  parentId.value = node.parentId ?? null
  form.value = { name: node.name, sort: node.sort ?? 0 }
  modalVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name.trim()) {
    message.error('请输入分类名称')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/categories/${editingId.value}`, {
        method: 'PUT',
        body: { name: form.value.name, sort: form.value.sort },
      })
      message.success('分类已更新')
    } else {
      await $fetch('/api/categories', {
        method: 'POST',
        body: { name: form.value.name, parentId: parentId.value, sort: form.value.sort },
      })
      message.success('分类已创建')
    }
    modalVisible.value = false
    fetchCategories()
  } catch (e: any) {
    message.error(e.data?.error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    const res: any = await $fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.error) {
      message.error(res.error.message)
    } else {
      message.success('分类已删除')
      fetchCategories()
    }
  } catch (e: any) {
    message.error(e.data?.error?.message || '删除失败')
  }
}

onMounted(() => fetchCategories())
</script>

<style scoped>
:deep(.category-tree .ant-tree-node-content-wrapper) {
  width: 100%;
}
:deep(.category-tree .ant-tree-title) {
  width: 100%;
  display: block;
}
</style>
