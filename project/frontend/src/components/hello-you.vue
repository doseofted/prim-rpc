<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <p>hello {{ name }}</p>
</template>

<style scoped>
p {
  font-family: sans-serif;
  font-size: 14px;
}
</style>
