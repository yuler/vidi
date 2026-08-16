<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, RefreshCw, Plus, X, HardDrive } from '@lucide/vue'
import type { ScanWarning } from '~~/shared/types'

const { data: settings, refresh: refreshSettings } = await useFetch<{ roots: string[]; autoNext: boolean }>('/api/settings')

const roots = ref<string[]>(settings.value?.roots ?? [])
const autoNext = ref(settings.value?.autoNext ?? false)
const saving = ref(false)
const scanning = ref(false)
const warnings = ref<ScanWarning[]>([])
const scanResult = ref<{ scannedAt: number; total: number } | null>(null)

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function notify(msg: string) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 3000)
}

function addRoot() {
  roots.value.push('')
}

function removeRoot(i: number) {
  roots.value.splice(i, 1)
}

async function save() {
  saving.value = true
  try {
    const cleaned = roots.value.map((r) => r.trim()).filter(Boolean)
    const result = await $fetch('/api/settings', {
      method: 'POST',
      body: { roots: cleaned, autoNext: autoNext.value },
    })
    roots.value = result.roots
    autoNext.value = result.autoNext
    notify('设置已保存')
    refreshSettings()
  } catch (e: any) {
    notify(e?.data?.statusMessage ?? '保存失败')
  } finally {
    saving.value = false
  }
}

async function scan() {
  scanning.value = true
  try {
    const result = await $fetch('/api/scan', { method: 'POST' })
    const total = result.roots.reduce((sum, r) => sum + r.courses.reduce((s, c) => s + c.videoCount, 0), 0)
    scanResult.value = { scannedAt: result.scannedAt, total }
    warnings.value = result.warnings ?? []
    notify(`扫描完成，共 ${total} 集`)
  } catch (e: any) {
    notify(e?.data?.statusMessage ?? '扫描失败')
  } finally {
    scanning.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div v-if="toast" class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-lg">
      {{ toast }}
    </div>

    <Button as-child variant="ghost" size="sm" class="mb-5 rounded-xl text-base font-bold text-muted-foreground">
      <NuxtLink to="/">
        <ArrowLeft class="mr-1 size-5" />
        返回首页
      </NuxtLink>
    </Button>

    <h1 class="mb-7 text-3xl font-extrabold">设置</h1>

    <section class="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
      <h2 class="mb-2 flex items-center gap-2 text-xl font-extrabold">
        <HardDrive class="size-6 text-primary" />
        视频目录
      </h2>
      <p class="mb-5 text-sm text-muted-foreground">
        可添加多个根目录（如另一块硬盘），课程会合并展示。默认目录：<code class="rounded-lg bg-muted px-1.5 py-0.5">/Volumes/ToshibaSSD/英语资料</code>
      </p>

      <div class="mb-4 space-y-3">
        <div v-for="(root, i) in roots" :key="i" class="flex gap-2">
          <Input v-model="roots[i]" placeholder="/Volumes/..." class="flex-1" />
          <Button variant="ghost" size="icon" class="rounded-xl text-muted-foreground" @click="removeRoot(i)">
            <X class="size-5" />
          </Button>
        </div>
      </div>

      <div class="flex gap-3">
        <Button variant="outline" class="rounded-xl" @click="addRoot">
          <Plus class="mr-1 size-5" />
          添加目录
        </Button>
        <Button class="rounded-xl" @click="save" :disabled="saving">
          <RefreshCw v-if="saving" class="mr-1 size-5 animate-spin" />
          {{ saving ? '保存中…' : '保存' }}
        </Button>
      </div>
    </section>

    <section class="mb-8 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
      <h2 class="mb-4 text-xl font-extrabold">播放</h2>
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-base font-bold">自动连播下一集</p>
          <p class="mt-0.5 text-sm text-muted-foreground">一集结束后自动跳到下一集（跨分组继续）</p>
        </div>
        <Switch v-model:checked="autoNext" @update:checked="save" />
      </div>
    </section>

    <section class="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
      <h2 class="mb-2 flex items-center gap-2 text-xl font-extrabold">
        <RefreshCw class="size-6 text-primary" />
        重新扫描
      </h2>
      <p class="mb-5 text-sm text-muted-foreground">
        平时会自动检测目录变化，无需手动。如果刚添加新文件想立刻看到，可手动扫描。
      </p>
      <Button class="rounded-xl" @click="scan" :disabled="scanning">
        <RefreshCw :class="scanning ? 'animate-spin' : ''" class="mr-1 size-5" />
        {{ scanning ? '扫描中…' : '开始扫描' }}
      </Button>

      <div v-if="scanResult" class="mt-5 text-sm font-bold text-muted-foreground">
        共 {{ scanResult.total }} 集
      </div>

      <ul v-if="warnings.length" class="mt-5 space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <li v-for="(w, i) in warnings" :key="i" class="font-semibold text-amber-700">
          {{ w.message }}
        </li>
      </ul>
    </section>
  </div>
</template>
