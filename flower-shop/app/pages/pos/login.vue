<template>
  <div class="login-bg">
    <a-card class="login-card" :bordered="false">
      <div class="login-header">
        <div class="logo">💐</div>
        <h1 class="title">花店收银台</h1>
        <div class="subtitle">POS 收银系统</div>
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
            登录收银台
          </a-button>
        </a-form-item>
      </a-form>

      <div class="login-tip">
        <span>收银员默认账号：</span>
        <span class="mono">cashier / cashier123</span>
      </div>
      <div class="login-alt">
        <NuxtLink to="/login">管理员登录 →</NuxtLink>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'

definePageMeta({ layout: false })
useHead({ title: '收银台登录 - 花店' })

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

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
    const ok = await login(formState.username, formState.password, { scope: 'pos' })
    if (ok) {
      const redirect = (route.query.redirect as string) || '/pos'
      router.push(redirect)
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
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #db2777 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

:deep(.ant-card-body) {
  padding: 32px 28px 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo {
  font-size: 48px;
  line-height: 1;
  margin-bottom: 12px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #db2777;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 13px;
  color: #9ca3af;
}

.login-btn {
  background: linear-gradient(135deg, #ec4899, #db2777);
  border: none;
  font-weight: 600;
  height: 44px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #db2777, #be185d);
}

.login-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: #9ca3af;
}

.login-alt {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
}

.login-alt a {
  color: #6b7280;
  text-decoration: none;
}

.login-alt a:hover {
  color: #db2777;
}

.mono {
  font-family: monospace;
  color: #db2777;
  font-weight: 600;
}
</style>
