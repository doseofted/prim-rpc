<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import HelloYou from "./components/hello-you.vue"
import { createPrim } from "prim"
import * as exampleServer from "example"
import type * as exampleClient from "example"

const { sayHello } = createPrim<typeof exampleClient>({
	endpoint: `https://api.${import.meta.env.VITE_HOST}`
})
const exampleArgs = { greeting: "Hey", name: "Ted" }
const message = ref<string>()
const matches = computed(() => message.value === exampleServer.sayHello(exampleArgs))
const errored = computed(() => message.value === "errored")
onMounted(async () => {
	try {
		message.value = await sayHello(exampleArgs)
	} catch (error) {
		message.value = "errored"
	}
})
</script>

<template>
  <div class="greeting">
    <hello-you
      :message="message"
      :class="{ matches, errored }"
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

.you {
  transition: color 1s;
  color: #fff;
}

.you.matches {
  color: #2aa;
}

.you.errored {
  color: #a22;
}
</style>
