<script setup lang="ts">
import type { Course, VideoItem } from '~~/shared/types'
import { isProgressDone, progressEntry, progressKey } from '~~/shared/progress'
import { Play, Check, Music, CircleCheck, Undo2 } from '@lucide/vue'

const props = defineProps<{ course: Course; video: VideoItem }>()

const { progress, refresh } = useProgress()
const toggling = ref(false)

const entry = computed(() => progressEntry(progress.value, props.course.slug, props.video.path))
const done = computed(() => isProgressDone(entry.value))
const pct = computed(() => {
  const p = entry.value
  if (!p || !p.duration) return 0
  return Math.min(100, Math.round((p.position / p.duration) * 100))
})

function watchUrl() {
  const parts = props.video.path.split('/').map(encodeURIComponent)
  return `/watch/${props.course.rootIndex}/${encodeURIComponent(props.course.dir)}/${parts.join('/')}`
}

async function toggleDone(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (toggling.value) return
  toggling.value = true
  const key = progressKey(props.course.slug, props.video.path)
  const duration = Math.max(entry.value?.duration ?? 0, 1)
  try {
    if (done.value) {
      await $fetch('/api/progress', {
        method: 'POST',
        body: { key, position: 0, duration, completed: false },
      })
    } else {
      await $fetch('/api/progress', {
        method: 'POST',
        body: { key, position: duration, duration, completed: true },
      })
    }
    await refresh()
  } finally {
    toggling.value = false
  }
}
</script>

<template>
  <div
    :data-episode-path="video.path"
    class="group flex scroll-mt-24 items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
  >
    <NuxtLink :to="watchUrl()" class="flex min-w-0 flex-1 items-center gap-3">
      <div class="relative shrink-0">
        <VideoCover :course="course" :video="video" :complete="done" class="h-14 w-24 overflow-hidden rounded-xl">
          <template #fallback>
            <span
              class="flex items-center justify-center rounded-full"
              :class="done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary'"
            >
              <Play v-if="!done" class="size-5" />
              <Check v-else class="size-5" />
            </span>
          </template>
        </VideoCover>
      </div>
      <div class="min-w-0 flex-1">
        <p class="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{{ video.title }}</p>
        <p class="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
          <Music v-if="video.type === 'audio'" class="size-3.5" />
          <span v-if="done" class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700">已看完</span>
          <span
            v-else-if="pct > 0"
            class="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
          >{{ pct }}%</span>
          <span v-else>未看</span>
        </p>
      </div>
    </NuxtLink>
    <Button
      type="button"
      size="icon"
      class="shrink-0 rounded-xl"
      :variant="done ? 'outline' : 'secondary'"
      :disabled="toggling"
      :title="done ? '标为未看完' : '标为看完'"
      :aria-label="done ? '标为未看完' : '标为看完'"
      @click="toggleDone"
    >
      <Undo2 v-if="done" class="size-5" />
      <CircleCheck v-else class="size-5" />
    </Button>
  </div>
</template>
