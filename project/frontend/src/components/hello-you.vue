<script setup lang="ts">
import { you } from "example"

withDefaults(defineProps<{
	name: string
}>(), {
	name: you
})
</script>

<template>
  <p>Hello {{ name }}</p>
</template>

<style scoped>
p {
  font-family: sans-serif;
  font-size: 14px;
}
</style>
