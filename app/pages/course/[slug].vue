<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
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
  const p = progress.value?.[video.path]
  if (!p || !p.duration) return 0
  return Math.min(100, Math.round((p.position / p.duration) * 100))
}

function isDone(video: VideoItem): boolean {
  const p = progress.value?.[video.path]
  if (!p || !p.duration) return false
  return p.position / p.duration >= 0.95 || p.duration - p.position <= 5
}

function groupCount(group: string): number {
  return course.value?.videos.filter((v) => v.group === group).length ?? 0
}
</script>

<template>
  <div>
    <Button as-child variant="ghost" size="sm" class="mb-4">
      <NuxtLink to="/">
        <ArrowLeft class="mr-1 h-4 w-4" />
        返回
      </NuxtLink>
    </Button>

    <h1 class="mb-2 text-2xl font-bold">{{ course?.title ?? '加载中…' }}</h1>
    <p v-if="course" class="mb-6 text-sm text-muted-foreground">共 {{ course.videoCount }} 集</p>

    <template v-if="course">
      <section v-if="course.videos.some((v) => !v.group)" class="mb-8">
        <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Folder class="h-5 w-5 text-primary" />
          全部
        </h2>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          <NuxtLink
            v-for="video in course.videos.filter((v) => !v.group)"
            :key="video.path"
            :to="watchUrl(video)"
            class="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary"
          >
            <VideoCover :course="course" :video="video" class="h-12 w-16 shrink-0 rounded-md">
              <template #fallback>
                <Play v-if="!isDone(video)" class="h-5 w-5 text-muted-foreground" />
                <Check v-else class="h-5 w-5 text-primary" />
              </template>
              <template #overlay>
                <div v-if="pct(video) > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-background/60">
                  <div class="h-full bg-primary" :style="{ width: pct(video) + '%' }" />
                </div>
              </template>
            </VideoCover>
            <div class="min-w-0">
              <p class="line-clamp-1 text-sm font-medium">{{ video.title }}</p>
              <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Music v-if="video.type === 'audio'" class="h-3 w-3" />
                <span v-if="pct(video) > 0">{{ pct(video) }}%</span>
                <span v-else>未看</span>
              </p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <Collapsible v-for="group in course.groups" :key="group" v-model:open="openGroups[group]" class="mb-8">
        <CollapsibleTrigger as-child>
          <button class="mb-3 flex w-full items-center gap-2 text-left text-lg font-semibold">
            <Folder class="h-5 w-5 shrink-0 text-primary" />
            {{ group }}
            <span class="text-sm font-normal text-muted-foreground">({{ groupCount(group) }})</span>
            <ChevronDown
              class="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform"
              :class="openGroups[group] ? 'rotate-180' : ''"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            <NuxtLink
              v-for="video in course.videos.filter((v) => v.group === group)"
              :key="video.path"
              :to="watchUrl(video)"
              class="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary"
            >
              <VideoCover :course="course" :video="video" class="h-12 w-16 shrink-0 rounded-md">
                <template #fallback>
                  <Play v-if="!isDone(video)" class="h-5 w-5 text-muted-foreground" />
                  <Check v-else class="h-5 w-5 text-primary" />
                </template>
                <template #overlay>
                  <div v-if="pct(video) > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-background/60">
                    <div class="h-full bg-primary" :style="{ width: pct(video) + '%' }" />
                  </div>
                </template>
              </VideoCover>
              <div class="min-w-0">
                <p class="line-clamp-1 text-sm font-medium">
                  {{ video.title }}
                </p>
                <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Music v-if="video.type === 'audio'" class="h-3 w-3" />
                  <span v-if="pct(video) > 0">{{ pct(video) }}%</span>
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
