<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { progressEntry } from '~~/shared/progress'
import { ArrowLeft, Folder, Play, Check, Music, ChevronDown } from '@lucide/vue'

const route = useRoute()
const { flatCourses } = useCourses()
const { progress } = useProgress()

const slug = computed(() => String(route.params.slug))
const course = computed<Course | null>(() => {
  return flatCourses.value.find((c) => c.slug === slug.value) ?? null
})

const openGroups = reactive<Record<string, boolean>>({})

function watchUrl(video: VideoItem) {
  const c = course.value
  if (!c) return '#'
  const parts = video.path.split('/').map(encodeURIComponent)
  return `/watch/${c.rootIndex}/${encodeURIComponent(c.dir)}/${parts.join('/')}`
}

function pct(video: VideoItem): number {
  const p = progressEntry(progress.value, course.value?.slug ?? '', video.path)
  if (!p || !p.duration) return 0
  return Math.min(100, Math.round((p.position / p.duration) * 100))
}

function isDone(video: VideoItem): boolean {
  const p = progressEntry(progress.value, course.value?.slug ?? '', video.path)
  if (!p || !p.duration) return false
  return p.position / p.duration >= 0.95 || p.duration - p.position <= 5
}

function groupCount(group: string): number {
  return course.value?.videos.filter((v) => v.group === group).length ?? 0
}

function groupOpenDefault(group: string): boolean {
  return !course.value?.videos.some((v) => v.group === group && !isDone(v))
}

watchEffect(() => {
  const groups = course.value?.groups ?? []
  for (const group of groups) {
    if (openGroups[group] === undefined) openGroups[group] = groupOpenDefault(group)
  }
})
</script>

<template>
  <div>
    <Button as-child variant="ghost" size="sm" class="mb-5 rounded-xl text-base font-bold text-muted-foreground">
      <NuxtLink to="/">
        <ArrowLeft class="size-5" />
        返回首页
      </NuxtLink>
    </Button>

    <h1 class="mb-1 text-3xl font-extrabold leading-tight">{{ course?.title ?? '加载中…' }}</h1>
    <p v-if="course" class="mb-7 text-base text-muted-foreground">共 {{ course.videoCount }} 集</p>

    <template v-if="course">
      <section v-if="course.videos.some((v) => !v.group)" class="mb-9">
        <h2 class="mb-4 flex items-center gap-2 text-xl font-extrabold">
          <Folder class="size-6 text-primary" />
          全部
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NuxtLink
            v-for="video in course.videos.filter((v) => !v.group)"
            :key="video.path"
            :to="watchUrl(video)"
            class="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div class="relative shrink-0">
              <VideoCover :course="course" :video="video" class="h-16 w-28 overflow-hidden rounded-xl">
                <template #fallback>
                  <span
                    class="flex items-center justify-center rounded-full"
                    :class="isDone(video) ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary'"
                  >
                    <Play v-if="!isDone(video)" class="size-6" />
                    <Check v-else class="size-6" />
                  </span>
                </template>
              </VideoCover>
            </div>
            <div class="min-w-0 flex-1">
              <p class="line-clamp-2 text-base font-bold leading-snug">{{ video.title }}</p>
              <p class="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Music v-if="video.type === 'audio'" class="size-4" />
                <span
                  v-if="pct(video) > 0"
                  class="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                >{{ pct(video) }}%</span>
                <span v-else>未看</span>
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <Collapsible
        v-for="group in course.groups"
        :key="group"
        v-model:open="openGroups[group]"
        class="mb-9"
      >
        <CollapsibleTrigger as-child>
          <button class="mb-4 flex w-full items-center gap-2 rounded-xl text-left text-xl font-extrabold">
            <Folder class="size-6 shrink-0 text-primary" />
            <span class="line-clamp-1">{{ group }}</span>
            <span class="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-sm font-bold text-secondary-foreground">
              {{ groupCount(group) }}
            </span>
            <ChevronDown
              class="ml-auto h-6 w-6 shrink-0 text-muted-foreground transition-transform"
              :class="openGroups[group] ? 'rotate-180' : ''"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="video in course.videos.filter((v) => v.group === group)"
              :key="video.path"
              :to="watchUrl(video)"
              class="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div class="relative shrink-0">
                <VideoCover :course="course" :video="video" class="h-16 w-28 overflow-hidden rounded-xl">
                  <template #fallback>
                    <span
                      class="flex items-center justify-center rounded-full"
                      :class="isDone(video) ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary'"
                    >
                      <Play v-if="!isDone(video)" class="size-6" />
                      <Check v-else class="size-6" />
                    </span>
                  </template>
                </VideoCover>
              </div>
              <div class="min-w-0 flex-1">
                <p class="line-clamp-2 text-base font-bold leading-snug">{{ video.title }}</p>
                <p class="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Music v-if="video.type === 'audio'" class="size-4" />
                  <span
                    v-if="pct(video) > 0"
                    class="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                  >{{ pct(video) }}%</span>
                  <span v-else>未看</span>
                </p>
              </div>
            </NuxtLink>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </template>
  </div>
</template>
