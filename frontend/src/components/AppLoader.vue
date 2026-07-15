<script setup lang="ts">
defineProps<{ loading: boolean }>()
</script>

<template>
  <Transition name="fade">
    <div v-if="loading" class="loader-overlay">
      <div class="loader-box">
        <div class="spinner" />
        <span class="loader-text">Carregando...</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.loader-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  border-radius: inherit;
}

.loader-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #ede9fe;
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.loader-text {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  letter-spacing: 0.02em;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
