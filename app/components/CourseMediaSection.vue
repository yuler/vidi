<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { isProgressDone, progressEntry } from '~~/shared/progress'
import { ChevronDown, ChevronUp } from '@lucide/vue'

const WINDOW = 10
const STEP = 10

const props = defineProps<{
  course: Course
  items: VideoItem[]
  title: string
  open: boolean
  listClass: string
  autoScroll?: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { progress } = useProgress()
const extraAbove = ref(0)
const extraBelow = ref(0)
const scrolled = ref(false)

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
})

function isDone(video: VideoItem) {
  return isProgressDone(progressEntry(progress.value, props.course.slug, video.path))
}

const anchorIndex = computed(() => {
  let best = -1
  let bestAt = 0
  props.items.forEach((item, i) => {
    const p = progressEntry(progress.value, props.course.slug, item.path)
    if (p && p.updatedAt > bestAt) {
      bestAt = p.updatedAt
      best = i
    }
  })
  if (best >= 0) return best
  const incomplete = props.items.findIndex((item) => !isDone(item))
  return incomplete >= 0 ? incomplete : 0
})

const start = computed(() => Math.max(0, anchorIndex.value - WINDOW - extraAbove.value))
const end = computed(() =>
  Math.min(props.items.length, anchorIndex.value + 1 + WINDOW + extraBelow.value),
)
const visible = computed(() => props.items.slice(start.value, end.value))
const hiddenAbove = computed(() => start.value)
const hiddenBelow = computed(() => props.items.length - end.value)

function showMoreAbove() {
  extraAbove.value += STEP
}
function showMoreBelow() {
  extraBelow.value += STEP
}

function scrollToAnchor() {
  const item = props.items[anchorIndex.value]
  if (!item || !props.open) return
  nextTick(() => {
    const el = document.querySelector(`[data-episode-path="${CSS.escape(item.path)}"]`)
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}

watch(
  () => [props.autoScroll, props.open, props.items.length, progress.value] as const,
  ([auto, isOpen, len, p]) => {
    if (scrolled.value || !auto || !isOpen || !len || p == null) return
    scrolled.value = true
    setTimeout(scrollToAnchor, 80)
  },
)

watch(
  () => props.items.length,
  () => {
    extraAbove.value = 0
    extraBelow.value = 0
    scrolled.value = false
  },
)
</script>

<template>
  <Collapsible v-if="items.length" v-model:open="openModel" class="mb-9">
    <CollapsibleTrigger as-child>
      <button class="mb-4 flex w-full items-center gap-2 rounded-xl text-left text-xl font-extrabold">
        <slot name="icon" />
        <span class="line-clamp-1">{{ title }}</span>
        <span class="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-sm font-bold text-secondary-foreground">
          {{ items.length }}
        </span>
        <ChevronDown
          class="ml-auto h-6 w-6 shrink-0 text-muted-foreground transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div v-if="hiddenAbove" class="mb-3 flex justify-center">
        <Button type="button" variant="outline" size="sm" class="rounded-xl" @click="showMoreAbove">
          <ChevronUp class="size-4" />
          向上显示更多（还有 {{ hiddenAbove }}）
        </Button>
      </div>
      <div :class="listClass">
        <CourseEpisodeCard
          v-for="video in visible"
          :key="video.path"
          :course="course"
          :video="video"
        />
      </div>
      <div v-if="hiddenBelow" class="mt-3 flex justify-center">
        <Button type="button" variant="outline" size="sm" class="rounded-xl" @click="showMoreBelow">
          <ChevronDown class="size-4" />
          向下显示更多（还有 {{ hiddenBelow }}）
        </Button>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
