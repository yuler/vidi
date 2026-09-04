<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { isProgressDone, progressEntry } from '~~/shared/progress'
import { ArrowLeft, Folder, LayoutGrid, List, Film, Music } from '@lucide/vue'

const LAYOUT_KEY = 'vidi-course-layout'

const route = useRoute()
const { flatCourses } = useCourses()
const { progress } = useProgress()

const slug = computed(() => String(route.params.slug))
const course = computed<Course | null>(() => {
  return flatCourses.value.find((c) => c.slug === slug.value) ?? null
})

const layout = ref<'grid' | 'list'>('grid')
const openByKind = reactive({ video: true, audio: false })
const openGroups = reactive<Record<string, boolean>>({})
const kindInited = ref(false)
const groupsInited = ref(false)

const listClass = computed(() =>
  layout.value === 'list' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3',
)

const videoItems = computed(() => course.value?.videos.filter((v) => v.type === 'video') ?? [])
const audioItems = computed(() => course.value?.videos.filter((v) => v.type === 'audio') ?? [])
const mixed = computed(() => videoItems.value.length > 0 && audioItems.value.length > 0)

const ungrouped = computed(() => course.value?.videos.filter((v) => !v.group) ?? [])

function isDone(video: VideoItem) {
  return isProgressDone(progressEntry(progress.value, course.value?.slug ?? '', video.path))
}

const lastPlayedItem = computed(() => {
  const c = course.value
  if (!c) return
  let best: VideoItem | undefined
  let bestAt = 0
  for (const item of c.videos) {
    const p = progressEntry(progress.value, c.slug, item.path)
    if (p && p.updatedAt > bestAt) {
      bestAt = p.updatedAt
      best = item
    }
  }
  return best
})

const ungroupedOpen = ref(true)

function groupItems(group: string) {
  return course.value?.videos.filter((v) => v.group === group) ?? []
}

function groupOpenDefault(group: string) {
  if (lastPlayedItem.value?.group === group) return true
  return !!groupItems(group).some((v) => !isDone(v))
}

function toggleLayout() {
  layout.value = layout.value === 'grid' ? 'list' : 'grid'
  if (import.meta.client) localStorage.setItem(LAYOUT_KEY, layout.value)
}

watch(slug, () => {
  kindInited.value = false
  groupsInited.value = false
  openByKind.video = true
  openByKind.audio = false
  for (const key of Object.keys(openGroups)) delete openGroups[key]
})

watch(
  () => [course.value, progress.value, mixed.value] as const,
  ([c, p, isMixed]) => {
    if (!c || p == null) return
    if (isMixed && !kindInited.value) {
      kindInited.value = true
      const last = lastPlayedItem.value
      const audioFirst = last?.type === 'audio'
      openByKind.video = !audioFirst
      openByKind.audio = audioFirst
    }
    if (!isMixed && !groupsInited.value) {
      groupsInited.value = true
      for (const group of c.groups) {
        openGroups[group] = groupOpenDefault(group)
      }
    }
  },
)

onMounted(() => {
  const saved = localStorage.getItem(LAYOUT_KEY)
  if (saved === 'list' || saved === 'grid') layout.value = saved
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

    <div class="mb-7 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-3xl font-extrabold leading-tight">{{ course?.title ?? '加载中…' }}</h1>
        <p v-if="course" class="mt-1 text-base text-muted-foreground">共 {{ course.videoCount }} 集</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        class="shrink-0 rounded-2xl"
        :title="layout === 'grid' ? '切换为列表' : '切换为网格'"
        :aria-label="layout === 'grid' ? '切换为列表' : '切换为网格'"
        @click="toggleLayout"
      >
        <List v-if="layout === 'grid'" class="size-6" />
        <LayoutGrid v-else class="size-6" />
      </Button>
    </div>

    <template v-if="course && mixed">
      <CourseMediaSection
        v-model:open="openByKind.video"
        title="视频"
        :course="course"
        :items="videoItems"
        :list-class="listClass"
        :auto-scroll="openByKind.video"
      >
        <template #icon>
          <Film class="size-6 shrink-0 text-primary" />
        </template>
      </CourseMediaSection>
      <CourseMediaSection
        v-model:open="openByKind.audio"
        title="音频"
        :course="course"
        :items="audioItems"
        :list-class="listClass"
        :auto-scroll="openByKind.audio"
      >
        <template #icon>
          <Music class="size-6 shrink-0 text-primary" />
        </template>
      </CourseMediaSection>
    </template>

    <template v-else-if="course">
      <CourseMediaSection
        v-if="ungrouped.length"
        v-model:open="ungroupedOpen"
        title="全部"
        :course="course"
        :items="ungrouped"
        :list-class="listClass"
        :auto-scroll="!course.groups.length || !lastPlayedItem?.group"
      >
        <template #icon>
          <Folder class="size-6 shrink-0 text-primary" />
        </template>
      </CourseMediaSection>

      <CourseMediaSection
        v-for="group in course.groups"
        :key="group"
        v-model:open="openGroups[group]"
        :title="group"
        :course="course"
        :items="groupItems(group)"
        :list-class="listClass"
        :auto-scroll="!!openGroups[group] && lastPlayedItem?.group === group"
      >
        <template #icon>
          <Folder class="size-6 shrink-0 text-primary" />
        </template>
      </CourseMediaSection>
    </template>
  </div>
</template>
