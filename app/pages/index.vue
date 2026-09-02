<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { matchProgressVideo, progressKey } from '~~/shared/progress'
import { History, Play, AlertTriangle, Film, RefreshCw } from '@lucide/vue'

const { flatCourses, status, error, refresh } = useCourses()
const { progress } = useProgress()

const continueWatching = computed<{ course: Course; video: VideoItem; courseUrl: string; watchUrl: string; pct: number }[]>(() => {
  const out: { course: Course; video: VideoItem; courseUrl: string; watchUrl: string; pct: number }[] = []
  const seen = new Set<string>()
  const entries = Object.entries(progress.value ?? {})
    .filter(([, p]) => p && p.position > 0 && p.duration > 0 && p.position / p.duration < 0.95 && p.duration - p.position > 5)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)

  for (const [key, p] of entries) {
    const match = matchProgressVideo(key, flatCourses.value)
    if (!match) continue
    const id = progressKey(match.course.slug, match.video.path)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      course: match.course,
      video: match.video,
      courseUrl: `/course/${match.course.slug}`,
      watchUrl: watchUrl(match.course, match.video),
      pct: Math.round((p.position / p.duration) * 100),
    })
    if (out.length >= 6) break
  }
  return out
})

function watchUrl(course: Course, video: VideoItem) {
  return `/watch/${course.rootIndex}/${encodeURIComponent(course.dir)}/${video.path.split('/').map(encodeURIComponent).join('/')}`
}
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

    <section v-if="continueWatching.length" class="mb-10">
      <h2 class="mb-4 flex items-center gap-2 text-xl font-extrabold">
        <History class="size-6 text-primary" />
        继续观看
      </h2>
      <div class="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
        <NuxtLink
          v-for="item in continueWatching"
          :key="item.watchUrl"
          :to="item.watchUrl"
          class="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div class="relative">
            <VideoCover :course="item.course" :video="item.video" class="aspect-video w-full">
              <template #fallback>
                <span class="flex size-12 items-center justify-center rounded-full bg-white/90 text-primary shadow">
                  <Play class="size-5 fill-current" />
                </span>
              </template>
              <template #overlay>
                <div class="absolute bottom-0 left-0 right-0 h-2 bg-black/30">
                  <div class="h-full rounded-r-full bg-primary" :style="{ width: item.pct + '%' }" />
                </div>
              </template>
            </VideoCover>
          </div>
          <div class="p-4">
            <p class="line-clamp-1 text-base font-bold">{{ item.video.title }}</p>
            <p class="mt-1 line-clamp-1 text-sm text-muted-foreground">{{ item.course.title }}</p>
          </div>
        </NuxtLink>
      </div>
    </section>

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
          v-for="course in flatCourses"
          :key="course.slug"
          :to="`/course/${course.slug}`"
          class="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
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
