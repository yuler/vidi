<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Course, VideoItem } from '~~/shared/types'
import { Play, Check } from '@lucide/vue'

const props = defineProps<{ course: Course; video: VideoItem; complete?: boolean }>()

const error = ref(false)

const coverUrl = computed(() => {
  const parts = props.video.path.split('/').map(encodeURIComponent)
  return `/api/cover/${props.course.rootIndex}/${encodeURIComponent(props.course.dir)}/${parts.join('/')}`
})

const showCover = computed(() => props.video.type === 'video' && !error.value)
</script>

<template>
  <div class="relative flex items-center justify-center overflow-hidden bg-muted">
    <img
      v-if="showCover"
      :src="coverUrl"
      :alt="video.title"
      class="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      @error="error = true"
    />
    <slot v-if="!showCover" name="fallback">
      <Play class="h-5 w-5 text-muted-foreground" />
    </slot>
    <div
      v-if="complete && showCover"
      class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/40"
    >
      <span class="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
        <Check class="size-5" />
      </span>
    </div>
    <slot name="overlay" />
  </div>
</template>
