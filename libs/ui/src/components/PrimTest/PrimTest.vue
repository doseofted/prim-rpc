<template>
  <div>Hello {{ name }}, from Vue</div>
</template>

<script lang="ts" setup>
defineProps<{
  name: string
}>()
</script>
