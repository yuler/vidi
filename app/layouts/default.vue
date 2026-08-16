<script setup lang="ts">
import { Settings, Play } from '@lucide/vue'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NuxtLink to="/" class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Play class="size-5 fill-current" />
          </span>
          <span class="text-2xl font-extrabold tracking-tight text-foreground">Vidi</span>
        </NuxtLink>
        <Button as-child variant="ghost" size="icon-lg" class="rounded-2xl text-muted-foreground" title="设置">
          <NuxtLink to="/settings">
            <Settings class="size-6" />
          </NuxtLink>
        </Button>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>
