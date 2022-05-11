<script setup lang="ts">
import "./HelloYou.css"
withDefaults(defineProps<{
	message: string
}>(), {
	message: "loading"
})
</script>

<template>
  <p>{{ message }}</p>
</template>
