<script setup lang="ts">
import { ref } from "vue"

defineProps<{ msg: string }>()

const count = ref(1)
</script>

<template>
  <button
    type="button"
    @click="count++"
  >
    <template
      v-for="i of count"
      :key="i"
    >
      {{ msg }}
    </template>
  </button>
</template>

<style lang="scss" scoped>
button {
  font-size: 4rem;
}
</style>