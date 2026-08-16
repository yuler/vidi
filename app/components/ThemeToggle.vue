<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'

const colorMode = useColorMode()

const modes = [
  { value: 'system', icon: Monitor, title: '跟随系统' },
  { value: 'light', icon: Sun, title: '浅色' },
  { value: 'dark', icon: Moon, title: '深色' },
] as const

const current = computed(() => modes.find((m) => m.value === colorMode.preference) ?? modes[0])
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    :title="current.title"
    @click="
      colorMode.preference =
        current.value === 'system' ? 'light' : current.value === 'light' ? 'dark' : 'system'
    "
  >
    <component :is="current.icon" class="h-4 w-4" />
  </Button>
</template>
