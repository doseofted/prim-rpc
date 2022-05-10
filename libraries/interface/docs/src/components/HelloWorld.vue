<script setup lang="ts">
defineProps<{ msg: string }>()
</script>

<template>
  <p>What's up {{ msg }}?</p>
</template>
