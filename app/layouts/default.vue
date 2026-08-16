<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <NuxtLink to="/" class="flex items-center gap-2 text-xl font-bold">
          <span class="text-primary">Vidi</span>
        </NuxtLink>
        <div class="flex items-center gap-1">
          <Button as-child variant="ghost" size="sm">
            <NuxtLink to="/">课程</NuxtLink>
          </Button>
          <Button as-child variant="ghost" size="sm">
            <NuxtLink to="/settings">设置</NuxtLink>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
