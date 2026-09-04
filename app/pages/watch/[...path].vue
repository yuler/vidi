<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ArrowLeft, Fullscreen, SkipForward, Music } from '@lucide/vue'
import type { Course, VideoItem } from '~~/shared/types'
import { isProgressDone, progressEntry, progressKey } from '~~/shared/progress'

const route = useRoute()
const { flatCourses } = useCourses()
const { progress } = useProgress()
const reporter = useProgressReporter()

const { data: settings } = await useFetch<{ roots: string[]; autoNext: boolean }>('/api/settings')

const mediaEl = ref<HTMLMediaElement | null>(null)
const playerWrap = ref<HTMLElement | null>(null)
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

const AUDIO_EXTS = new Set(['mp3', 'm4a', 'aac', 'wav'])

const isAudio = computed(() => {
  if (video.value?.type === 'audio') return true
  const ext = relPath.split('.').pop()?.toLowerCase()
  return !!ext && AUDIO_EXTS.has(ext)
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

const key = computed(() => progressKey(`${rootIndex}-${courseDir}`, relPath))

function watchUrlFor(v: VideoItem) {
  const parts = v.path.split('/').map(encodeURIComponent)
  return `/watch/${rootIndex}/${encodeURIComponent(courseDir)}/${parts.join('/')}`
}

function goNext() {
  if (nextVideo.value) {
    navigateTo(watchUrlFor(nextVideo.value.video), { external: false })
  }
}

function fsElement() {
  return document.fullscreenElement || (document as any).webkitFullscreenElement || null
}

function videoNode() {
  const el = mediaEl.value
  if (!el || el.tagName !== 'VIDEO') return null
  return el as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void
    webkitExitFullscreen?: () => void
    webkitDisplayingFullscreen?: boolean
  }
}

function enterFullscreen() {
  const el = videoNode()
  const wrap = playerWrap.value
  if (!el) return
  if (el.webkitDisplayingFullscreen) {
    el.webkitExitFullscreen?.()
    return
  }
  if (typeof el.webkitEnterFullscreen === 'function') {
    if (el.paused) void el.play()
    el.webkitEnterFullscreen()
    return
  }
  const current = fsElement()
  if (current === wrap || current === el) {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen()
    return
  }
  const target = wrap ?? el
  if (target.requestFullscreen) target.requestFullscreen().catch(() => {})
  else if ((target as any).webkitRequestFullscreen) (target as any).webkitRequestFullscreen()
}

function onLoadedMetadata() {
  const el = mediaEl.value
  const p = progressEntry(progress.value, `${rootIndex}-${courseDir}`, relPath)
  if (isProgressDone(p) || !el) return
  if (p && p.position > 0) {
    el.currentTime = Math.min(p.position, p.duration - 1)
  }
}

function onPlay() {
  speedMenuOpen.value = false
}

function onTimeUpdate() {
  const el = mediaEl.value
  if (!el) return
  if (isProgressDone(progressEntry(progress.value, `${rootIndex}-${courseDir}`, relPath))) return
  if (el.duration && Number.isFinite(el.duration)) {
    reporter.send({ key: key.value, position: el.currentTime, duration: el.duration })
  }
}

function onEnded() {
  const el = mediaEl.value
  if (el?.duration) {
    reporter.send({ key: key.value, position: el.duration, duration: el.duration, completed: true })
  }
  if (settings.value?.autoNext && nextVideo.value) {
    showTitleHint.value = true
    titleHintText.value = nextVideo.value.video.title
    setTimeout(() => {
      showTitleHint.value = false
      goNext()
    }, 2000)
  }
}

function setSpeed(s: number) {
  speed.value = s
  if (mediaEl.value) mediaEl.value.playbackRate = s
  speedMenuOpen.value = false
}

watch(() => settings.value, (s) => {
  if (s && mediaEl.value) mediaEl.value.playbackRate = speed.value
})

onBeforeUnmount(() => {
  const el = mediaEl.value
  if (el && el.duration) reporter.drain()
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <Button as-child variant="ghost" class="rounded-xl text-base font-bold text-muted-foreground">
        <NuxtLink :to="`/course/${course?.slug ?? ''}`">
          <ArrowLeft class="mr-1 size-5" />
          返回课程
        </NuxtLink>
      </Button>
      <div class="min-w-0 text-center">
        <p class="truncate text-lg font-bold">{{ video?.title }}</p>
        <p class="truncate text-sm text-muted-foreground">{{ course?.title }}</p>
      </div>
      <button
        v-if="!isAudio"
        type="button"
        class="inline-flex shrink-0 items-center rounded-xl px-3 py-2 text-base font-bold text-muted-foreground"
        @click="enterFullscreen"
      >
        <Fullscreen class="mr-1 size-5" />
        全屏
      </button>
      <span v-else class="inline-block w-16" />
    </div>

    <div
      v-if="isAudio"
      class="relative rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <div class="mb-5 flex items-center gap-3">
        <span class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Music class="size-6" />
        </span>
        <p class="text-base font-bold">音频</p>
      </div>
      <audio
        ref="mediaEl"
        :src="streamUrl"
        class="w-full"
        controls
        preload="metadata"
        @loadedmetadata="onLoadedMetadata"
        @play="onPlay"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
      />
      <div class="mt-4 flex justify-end">
        <div class="relative">
          <Button variant="secondary" size="lg" class="rounded-xl text-base font-bold" @click.stop="speedMenuOpen = !speedMenuOpen">
            {{ speed }}x
          </Button>
          <div v-if="speedMenuOpen" class="absolute bottom-full right-0 z-20 mb-1 flex flex-col gap-1 rounded-xl bg-black/80 p-2">
            <button v-for="s in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="s" class="rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/20" :class="{ 'bg-white/30': speed === s }" @click="setSpeed(s)">
              {{ s }}x
            </button>
          </div>
        </div>
      </div>
      <div v-if="showTitleHint" class="mt-3 rounded-full bg-black/70 px-4 py-1.5 text-center text-sm text-white">
        下一集：{{ titleHintText }}
      </div>
    </div>

    <div v-else ref="playerWrap" class="player-wrap relative overflow-hidden rounded-2xl bg-black">
      <video
        ref="mediaEl"
        :src="streamUrl"
        class="aspect-video w-full object-contain"
        controls
        playsinline
        :webkit-playsinline="true"
        preload="metadata"
        @loadedmetadata="onLoadedMetadata"
        @play="onPlay"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
      />

      <div v-if="showTitleHint" class="absolute inset-x-0 top-4 z-20 mx-auto w-fit rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
        下一集：{{ titleHintText }}
      </div>

      <div class="absolute bottom-3 right-3 z-10 flex items-center gap-2">
        <div class="relative">
          <Button variant="secondary" size="lg" class="rounded-xl bg-black/60 text-base font-bold text-white hover:bg-black/80" @click.stop="speedMenuOpen = !speedMenuOpen">
            {{ speed }}x
          </Button>
          <div v-if="speedMenuOpen" class="absolute bottom-full right-0 z-20 mb-1 flex flex-col gap-1 rounded-xl bg-black/80 p-2">
            <button v-for="s in [0.5, 0.75, 1, 1.25, 1.5, 2]" :key="s" class="rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/20" :class="{ 'bg-white/30': speed === s }" @click="setSpeed(s)">
              {{ s }}x
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="nextVideo" class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div class="min-w-0">
        <p class="text-sm font-bold text-muted-foreground">下一集</p>
        <p class="truncate text-base font-bold">{{ nextVideo.video.title }}</p>
      </div>
      <Button size="lg" class="shrink-0 rounded-xl" @click="goNext">
        <SkipForward class="mr-1 size-5" />
        下一集
      </Button>
    </div>
  </div>
</template>
