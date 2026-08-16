<script setup lang="ts">
import type { CollapsibleContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { CollapsibleContent, useForwardProps } from 'reka-ui'
import { cn } from '~/lib/utils'

const props = defineProps<CollapsibleContentProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <CollapsibleContent
    v-bind="forwardedProps"
    :class="cn('overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down', props.class)"
  >
    <slot />
  </CollapsibleContent>
</template>
