<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ArrowLeft, Gauge, SkipForward } from '@lucide/vue'
import type { Course, VideoItem } from '~~/shared/types'

const route = useRoute()
const { flatCourses } = useCourses()
const { progress } = useProgress()
const reporter = useProgressReporter()

const { data: settings } = await useFetch<{ roots: string[]; autoNext: boolean }>('/api/settings')

const videoEl = ref<HTMLVideoElement | null>(null)
const speedMenuOpen = ref(false)
const speed = ref(1)
const showTitleHint = ref(false)
const titleHintText = ref('')

const pathParts = computed<string[]>(() => {
  const p = route.params.path
  return Array.isArray(p) ? p : [p ?? '']
})

const rootIndex = Number(pathParts.value[0])
const courseDir = decodeURIComponent(pathParts.value[1] ?? '')
const relPath = pathParts.value.slice(2).map(decodeURIComponent).join('/')

const streamUrl = computed(() => {
  const parts = pathParts.value.map(encodeURIComponent)
  return `/api/stream/${parts.join('/')}`
})

const course = computed<Course | null>(() => {
  return flatCourses.value.find((c) => c.rootIndex === rootIndex && c.dir === courseDir) ?? null
})

const video = computed<VideoItem | null>(() => {
  return course.value?.videos.find((v) => v.path === relPath) ?? null
})

const currentIndex = computed(() => {
  if (!course.value) return -1
  return course.value.videos.findIndex((v) => v.path === relPath)
})

const nextVideo = computed<{ course: Course; video: VideoItem } | null>(() => {
  if (!course.value || currentIndex.value < 0) return null
  const next = course.value.videos[currentIndex.value + 1]
  return next ? { course: course.value, video: next } : null
})

const key = computed(() => relPath)

function watchUrlFor(v: VideoItem) {
  const parts = v.path.split('/').map(encodeURIComponent)
  return `/watch/${rootIndex}/${encodeURIComponent(courseDir)}/${parts.join('/')}`
}

function goNext() {
  if (nextVideo.value) {
    navigateTo(watchUrlFor(nextVideo.value.video), { external: false })
  }
}

function onLoadedMetadata() {
  const p = progress.value?.[key.value]
  if (p && p.position > 0 && videoEl.value) {
    const seekTo = Math.min(p.position, p.duration - 1)
    videoEl.value.currentTime = seekTo
  }
}

function onPlay() {
  speedMenuOpen.value = false
}

function onTimeUpdate() {
  const el = videoEl.value
  if (!el) return
  if (el.duration && Number.isFinite(el.duration)) {
    reporter.send({ key: key.value, position: el.currentTime, duration: el.duration })
  }
}

function onEnded() {
  const el = videoEl.value
  if (el) reporter.send({ key: key.value, position: el.duration || 0, duration: el.duration || 0 })
  if (settings.value?.autoNext && nextVideo.value) {
    showTitleHint.value = true
    titleHintText.value = nextVideo.value.video.title
    setTimeout(() => {
      showTitleHint.value = false
      goNext()
    }, 2000)
  }
}

function togglePlay() {
  const el = videoEl.value
  if (!el) return
  if (el.paused) el.play()
  else el.pause()
}

function setSpeed(s: number) {
  speed.value = s
  if (videoEl.value) videoEl.value.playbackRate = s
  speedMenuOpen.value = false
}

function enterFullscreen() {
  const el = videoEl.value
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {})
  } else if (el.requestFullscreen) {
    el.requestFullscreen().catch(() => {})
  } else if ((el as any).webkitEnterFullscreen) {
    ;(el as any).webkitEnterFullscreen()
  }
}

watch(() => settings.value, (s) => {
  if (s && videoEl.value) videoEl.value.playbackRate = speed.value
})

onBeforeUnmount(() => {
  const el = videoEl.value
  if (el && el.duration) {
    reporter.drain()
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <Button as-child variant="ghost" size="sm">
        <NuxtLink :to="`/course/${course?.slug ?? ''}`">
          <ArrowLeft class="mr-1 h-4 w-4" />
          返回课程
        </NuxtLink>
      </Button>
      <div class="min-w-0 text-center">
        <p class="truncate text-sm font-semibold">{{ video?.title }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ course?.title }}</p>
      </div>
      <Button variant="ghost" size="sm" @click="enterFullscreen">
        <Gauge class="mr-1 h-4 w-4" />
        全屏
      </Button>
    </div>

    <div class="relative overflow-hidden rounded-xl bg-black">
      <video
        ref="videoEl"
        :src="streamUrl"
        class="aspect-video w-full"
        controls
        playsinline
        :webkit-playsinline="true"
        preload="metadata"
        @loadedmetadata="onLoadedMetadata"
        @play="onPlay"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @click="togglePlay"
      />

      <div v-if="showTitleHint" class="absolute inset-x-0 top-4 z-20 mx-auto w-fit rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
        下一集：{{ titleHintText }}
      </div>

      <div class="absolute bottom-3 right-3 z-10 flex items-center gap-2">
        <div class="relative">
          <Button variant="secondary" size="sm" class="bg-black/60 text-white hover:bg-black/80" @click.stop="speedMenuOpen = !speedMenuOpen">
            {{ speed }}x
          </Button>
          <div v-if="speedMenuOpen" class="absolute bottom-full right-0 z-20 mb-1 flex flex-col gap-1 rounded-lg bg-black/80 p-2">
            <button v-for="s in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="s" class="rounded px-3 py-1.5 text-sm text-white hover:bg-white/20" :class="{ 'bg-white/30': speed === s }" @click="setSpeed(s)">
              {{ s }}x
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="nextVideo" class="flex items-center justify-between rounded-lg border bg-card p-3">
      <p class="text-sm text-muted-foreground">下一集：{{ nextVideo.video.title }}</p>
      <Button size="sm" @click="goNext">
        <SkipForward class="mr-1 h-4 w-4" />
        下一集
      </Button>
    </div>
  </div>
</template>
