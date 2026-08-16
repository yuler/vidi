<script setup lang="ts">
import type { CollapsibleTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { CollapsibleTrigger } from 'reka-ui'
import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<CollapsibleTriggerProps & { class?: HTMLAttributes['class'] }>(),
  { asChild: true },
)
</script>

<template>
  <CollapsibleTrigger v-bind="props" :class="cn('cursor-pointer', props.class)">
    <slot />
  </CollapsibleTrigger>
</template>
