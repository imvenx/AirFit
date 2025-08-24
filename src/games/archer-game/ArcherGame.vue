<template>
  <div class="archer full-width full-height flex flex-center">
    <div class="coming-soon-container text-center">
      <q-icon name="construction" size="100px" color="primary" />
      <h2 class="text-h3 q-mt-lg q-mb-md">Coming Soon!</h2>
      <p class="text-h6 text-grey-7">
        Archery is currently under development.
      </p>
      <p class="text-body1 text-grey-6 q-mt-md">
        Aim and shoot targets with gesture-based archery in this precision game!
      </p>
      <q-btn @click="$emit('exit')" color="primary" size="lg" label="Back to Games" class="q-mt-xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  exit: []
}>()
</script>

<style scoped>
.archer {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.coming-soon-container {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
}
</style>