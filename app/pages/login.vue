<template>
  <div class="login-bg">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <div class="logo">花</div>
        <h1 class="title">花间集</h1>
        <div class="subtitle">花店管理系统</div>
      </div>

      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        @finish="handleLogin"
      >
        <a-form-item name="username" label="用户名">
          <a-input
            v-model:value="formState.username"
            size="large"
            placeholder="请输入用户名"
            autocomplete="username"
          >
            <template #prefix><UserOutlined class="text-gray-400" /></template>
          </a-input>
        </a-form-item>

        <a-form-item name="password" label="密码">
          <a-input-password
            v-model:value="formState.password"
            size="large"
            placeholder="请输入密码"
            autocomplete="current-password"
          >
            <template #prefix><LockOutlined class="text-gray-400" /></template>
          </a-input-password>
        </a-form-item>

        <a-form-item class="mb-0">
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
            class="login-btn"
          >
            登录
          </a-button>
        </a-form-item>
      </a-form>

      <div class="login-tip">
        <span>管理员、员工、收银员统一从此入口登录</span>
      </div>
      <div class="login-tip muted-tip">
        <span>默认管理员：</span>
        <span class="mono">admin / admin123</span>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'

definePageMeta({ layout: false })
useHead({ title: '登录 - 花店管理系统' })

const router = useRouter()
const route = useRoute()
const { login, user } = useAuth()

const formRef = ref<FormInstance>()
const loading = ref(false)
const formState = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  loading.value = true
  try {
    const ok = await login(formState.username, formState.password)
    if (ok) {
      const redirect = route.query.redirect as string | undefined
      if (redirect) {
        router.push(redirect)
        return
      }
      router.push(user.value?.role === 'cashier' ? '/pos' : '/')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 12% 18%, rgba(168, 185, 127, 0.26), transparent 34%),
    radial-gradient(circle at 86% 80%, rgba(122, 98, 56, 0.18), transparent 38%),
    linear-gradient(135deg, var(--paper) 0%, var(--avo-50) 45%, var(--avo-700) 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--paper-3);
  box-shadow: var(--shadow-md);
}

:deep(.ant-card-body) {
  padding: 32px 28px 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  border-radius: 16px;
  background: var(--avo-300);
  color: var(--avo-900);
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 12px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--avo-800);
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 13px;
  color: #9ca3af;
}

.login-btn {
  background: linear-gradient(135deg, var(--avo-700), var(--avo-800));
  border: none;
  font-weight: 600;
  height: 44px;
}

.login-btn:hover {
  background: linear-gradient(135deg, var(--avo-800), var(--avo-900));
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #9ca3af;
}

.muted-tip {
  margin-top: 6px;
}

.mono {
  font-family: monospace;
  color: var(--avo-700);
  font-weight: 600;
}
</style>
