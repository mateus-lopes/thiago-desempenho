<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ loading?: boolean }>()

type Phase = 'hidden' | 'loading' | 'completing'
const phase = ref<Phase>('hidden')

watch(() => props.loading, (val) => {
  if (val) {
    phase.value = 'loading'
  } else if (phase.value === 'loading') {
    phase.value = 'completing'
    setTimeout(() => { phase.value = 'hidden' }, 380)
  }
}, { immediate: true })
</script>

<template>
  <div v-if="phase !== 'hidden'" class="top-bar" :class="phase" />
</template>

<style scoped>
.top-bar {
  position: fixed;
  top: 0; left: 0;
  height: 3.5px;
  z-index: 9999;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(90deg, #7c3aed, #a855f7);
  pointer-events: none;
}

.top-bar.loading {
  animation: bar-loading 2.5s ease-out forwards;
}

.top-bar.completing {
  animation: bar-complete 0.38s ease forwards;
}

@keyframes bar-loading {
  0%   { width: 0%; }
  20%  { width: 35%; }
  50%  { width: 60%; }
  80%  { width: 75%; }
  100% { width: 85%; }
}

@keyframes bar-complete {
  0%   { width: 85%; opacity: 1; }
  55%  { width: 100%; opacity: 1; }
  100% { width: 100%; opacity: 0; }
}
</style>
