<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { Play, History, AlertTriangle } from '@lucide/vue'

const { flatCourses, status, error, refresh } = useCourses()
const { progress } = useProgress()

const continueWatching = computed<{ course: Course; video: VideoItem; courseUrl: string; watchUrl: string; pct: number }[]>(() => {
  const out: { course: Course; video: VideoItem; courseUrl: string; watchUrl: string; pct: number }[] = []
  const seen = new Set<string>()
  const entries = Object.entries(progress.value ?? {})
    .filter(([, p]) => p && p.position > 0 && p.duration > 0 && p.position / p.duration < 0.95 && p.duration - p.position > 5)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)

  for (const [key] of entries) {
    for (const course of flatCourses.value) {
      const video = course.videos.find((v) => v.path === key)
      if (video) {
        const p = progress.value?.[key]
        out.push({
          course,
          video,
          courseUrl: `/course/${course.slug}`,
          watchUrl: watchUrl(course, video),
          pct: p ? Math.round((p.position / p.duration) * 100) : 0,
        })
        seen.add(key)
        break
      }
    }
    if (out.length >= 6) break
  }
  return out
})

function watchUrl(course: Course, video: VideoItem) {
  return `/watch/${course.rootIndex}/${encodeURIComponent(course.dir)}/${video.path.split('/').map(encodeURIComponent).join('/')}`
}

function pct(course: Course, video: VideoItem): number {
  const p = progress.value?.[video.path]
  if (!p || !p.duration) return 0
  return Math.min(100, Math.round((p.position / p.duration) * 100))
}

function isDone(course: Course, video: VideoItem): boolean {
  const p = progress.value?.[video.path]
  if (!p || !p.duration) return false
  return p.position / p.duration >= 0.95 || p.duration - p.position <= 5
}
</script>

<template>
  <div>
    <div v-if="error" class="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
      <div class="flex items-center gap-2 font-medium">
        <AlertTriangle class="h-4 w-4" />
        未找到硬盘
      </div>
      <p class="mt-1 text-muted-foreground">请确认移动硬盘已连接，或到设置页检查视频目录。</p>
      <Button size="sm" variant="outline" class="mt-2" @click="refresh">重试</Button>
    </div>

    <section v-if="continueWatching.length" class="mb-10">
      <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
        <History class="h-5 w-5" />
        继续观看
      </h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <NuxtLink
          v-for="item in continueWatching"
          :key="item.watchUrl"
          :to="item.watchUrl"
          class="group"
        >
          <VideoCover
            :course="item.course"
            :video="item.video"
            class="mb-2 aspect-video rounded-xl"
          >
            <template #fallback>
              <Play class="h-10 w-10 text-muted-foreground transition group-hover:scale-110 group-hover:text-primary" />
            </template>
            <template #overlay>
              <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-background/60">
                <div class="h-full bg-primary" :style="{ width: item.pct + '%' }" />
              </div>
            </template>
          </VideoCover>
          <p class="line-clamp-1 text-sm font-medium">{{ item.video.title }}</p>
          <p class="text-xs text-muted-foreground">{{ item.course.title }}</p>
        </NuxtLink>
      </div>
    </section>

    <section>
      <h2 class="mb-4 text-lg font-semibold">课程</h2>

      <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <div v-for="i in 8" :key="i" class="aspect-video animate-pulse rounded-xl bg-muted" />
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <NuxtLink
          v-for="course in flatCourses"
          :key="course.slug"
          :to="`/course/${course.slug}`"
          class="group overflow-hidden rounded-xl border bg-card transition hover:border-primary hover:shadow-md"
        >
          <VideoCover
            v-if="course.videos[0]"
            :course="course"
            :video="course.videos[0]"
            class="aspect-video w-full border-b"
          />
          <div class="p-5">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-lg font-bold leading-snug group-hover:text-primary">
                {{ course.title }}
              </h3>
            </div>
            <p class="text-sm text-muted-foreground">共 {{ course.videoCount }} 集</p>
          </div>
        </NuxtLink>
      </div>

      <p v-if="!flatCourses.length && !error" class="mt-4 text-sm text-muted-foreground">
        没有找到课程，请到设置页检查视频目录并点击「重新扫描」。
      </p>
    </section>
  </div>
</template>
