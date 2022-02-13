<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import HelloYou from "./components/hello-you.vue"
import { createPrimClient } from "prim"
import * as exampleServer from "example"
import type * as exampleClient from "example"

const primLocal = createPrimClient({ server: true }, exampleServer)
const expectedMessage = ref("")
const exampleArgs = { greeting: "Hey", name: "Ted" }
const { sayHello } = createPrimClient<typeof exampleClient>({
	endpoint: `https://api.${import.meta.env.VITE_HOST}`
})
const message = ref<string>()
const matches = computed(() => message.value === expectedMessage.value)
const errored = computed(() => message.value === "errored")
onMounted(async () => {
	try {
		message.value = await sayHello(exampleArgs)
		expectedMessage.value = await primLocal.sayHello(exampleArgs)
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
