<template>
  <div
    ref="light"
    class="test"
    :style="positionStyle"
  />
</template>

<script lang="ts" setup>
import { useMouse, useWindowSize } from '@vueuse/core';
import { computed, ref, StyleValue } from 'vue';

const props = withDefaults(defineProps())

const test = ref<HTMLElement>()
const positionStyle = computed<StyleValue>(() => ({
  transform: `translate(-50%, -50%) translate(${pos.x.value}px, ${pos.y.value}px)`
}))
const win = useWindowSize()
const distance = computed(() => {
  const 
})
const goal = computed(() => ({ x: win.width.value, y: 0 }))
</script>

<style lang="scss" scoped>
.test {
  --strength: 1;
  --color: rgba(255,255,255, var(--strength));
  position: absolute;
  width: 500px;
  height: 500px;
  /* background-color: var(--color); */
  background-image: radial-gradient(circle closest-side at center, var(--color) 10%, transparent 100%);
  mix-blend-mode: screen;
  isolation: isolate;
}
</style>