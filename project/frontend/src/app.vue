<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import { you as proposedYou } from "example"
import HelloYou from "./components/hello-you.vue"

async function hello () {
	try {
		const result = await fetch(`https://api.${import.meta.env.VITE_HOST}`)
		const json = await result.json()
		return json.Hello
	} catch (error) {
		return "stranger"
	}
}
const you = ref<string>()
const matches = computed(() => you.value === proposedYou)
onMounted(async () => {
	you.value = await hello()
})
</script>

<template>
  <div class="greeting">
    <hello-you
      :name="you"
      :class="{ matches }"
      class="you"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #fff;
}

div {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
}

.you { transition: color 3s; }

.you:not(.matches) {
  color: #2aa;
}
</style>
