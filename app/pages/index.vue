<script setup lang="ts">
import type { Course } from '~~/shared/types'
import { matchProgressVideo } from '~~/shared/progress'
import { Play, AlertTriangle, Film, RefreshCw } from '@lucide/vue'

const { flatCourses, status, error, refresh } = useCourses()
const { progress } = useProgress()

const lastWatchedSlug = computed(() => {
  let bestSlug: string | null = null
  let bestAt = 0
  for (const [key, p] of Object.entries(progress.value ?? {})) {
    if (!p?.updatedAt) continue
    const match = matchProgressVideo(key, flatCourses.value)
    if (!match) continue
    if (p.updatedAt > bestAt) {
      bestAt = p.updatedAt
      bestSlug = match.course.slug
    }
  }
  return bestSlug
})

const homeCourses = computed<Course[]>(() => {
  const list = [...flatCourses.value]
  const slug = lastWatchedSlug.value
  if (!slug) return list
  const i = list.findIndex((c) => c.slug === slug)
  if (i <= 0) return list
  const [course] = list.splice(i, 1)
  if (!course) return list
  return [course, ...list]
})
</script>

<template>
  <div>
    <div v-if="error" class="mb-8 flex items-center gap-4 rounded-2xl border border-destructive/40 bg-card p-6">
      <span class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle class="size-6" />
      </span>
      <div class="min-w-0">
        <p class="text-base font-bold">未找到硬盘</p>
        <p class="mt-0.5 text-sm text-muted-foreground">请确认移动硬盘已连接，或到设置页检查视频目录。</p>
        <Button variant="outline" class="mt-3" @click="refresh">
          <RefreshCw class="size-4" />
          重试
        </Button>
      </div>
    </div>

    <section>
      <h2 class="mb-4 flex items-center gap-2 text-xl font-extrabold">
        <Film class="size-6 text-primary" />
        课程
      </h2>

      <div v-if="status === 'pending'" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 6" :key="i" class="aspect-video animate-pulse rounded-2xl bg-card" />
      </div>

      <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="course in homeCourses"
          :key="course.slug"
          :to="`/course/${course.slug}`"
          class="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          :class="course.slug === lastWatchedSlug ? 'border-primary ring-2 ring-primary/20' : 'border-border/70 hover:border-primary/40'"
        >
          <VideoCover
            v-if="course.videos[0]"
            :course="course"
            :video="course.videos[0]"
            class="aspect-video w-full"
          >
            <template #fallback>
              <span class="flex size-12 items-center justify-center rounded-full bg-white/90 text-primary shadow">
                <Play class="size-5 fill-current" />
              </span>
            </template>
            <template #overlay>
              <span
                v-if="course.slug === lastWatchedSlug"
                class="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow"
              >
                最近在看
              </span>
            </template>
          </VideoCover>
          <div class="flex items-center justify-between gap-3 p-5">
            <h3 class="min-w-0 line-clamp-2 text-xl font-extrabold leading-snug group-hover:text-primary">
              {{ course.title }}
            </h3>
            <span class="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
              共 {{ course.videoCount }} 集
            </span>
          </div>
        </NuxtLink>
      </div>

      <p v-if="!flatCourses.length && !error" class="mt-4 text-sm text-muted-foreground">
        没有找到课程，请到设置页检查视频目录并点击「重新扫描」。
      </p>
    </section>
  </div>
</template>
