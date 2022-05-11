<script setup lang="ts">
import c from "./HelloYou.module.css"
withDefaults(defineProps<{
	message: string
}>(), {
	message: "loading"
})
</script>

<template>
  <p :class="c.test">
    {{ message }}
  </p>
</template>
