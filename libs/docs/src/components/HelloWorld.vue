<script setup lang="ts">
import { ref } from "vue"
import { useMouse } from "@vueuse/core"

defineProps<{ msg: string }>()

const count = ref(1)
const { x, y } = useMouse()
</script>

<template>
  <button
    type="button"
    class="bg-white border border-teal rounded-full px-4 py-2 appearance-none"
    @click="count++"
  >
    <template
      v-for="i of count"
      :key="i"
    >
      {{ msg }} ({{ x }}, {{ y }})
    </template>
  </button>
</template>
