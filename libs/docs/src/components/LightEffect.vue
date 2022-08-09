<template>
  <div>
    <div
      ref="test"
      class="test"
    />
  </div>
</template>

<script lang="ts" setup>
import { reactify, resolveUnref, useElementBounding, useElementSize, useMouse, useWindowSize } from '@vueuse/core';
import { computed, Ref, ref, StyleValue, unref, watch, watchEffect } from 'vue';
import { Pt } from "pts"

const newPt = (xRef: Ref<number>, yRef: Ref<number>) => {
  const [x, y] = [xRef, yRef].map(a => unref(a))
  const mousePt = ref(new Pt({ x, y }))
  watch([xRef, yRef], ([newX, newY]) => {
    console.log(mousePt.value);
    mousePt.value.x = newX
    mousePt.value.y = newY
  })
  return mousePt
}
const m = useMouse()
const mouse = newPt(m.x, m.y)
watchEffect(() => {
  console.log("whta",mouse.value);
})
// const test = ref<HTMLElement>()
// const positionStyle = computed<StyleValue>(() => ({
//   transform: `translate(-50%, -50%) translate(${pos.value.x}px, ${pos.value.y}px)`
// }))
// const win = useWindowSize()
// const goal = computed(() => ({ x: win.width.value, y: 0 }))
</script>

<style lang="scss" scoped>
.test {
  --color: white;
  position: absolute;
  width: 500px;
  height: 500px;
  /* background-color: var(--color); */
  background-image: radial-gradient(circle closest-side at center, var(--color) 10%, transparent 100%);
  mix-blend-mode: screen;
  isolation: isolate;
}
</style>