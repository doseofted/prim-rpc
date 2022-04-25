<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import HelloYou from "./components/hello-you.vue"
import { createPrimClient } from "prim"
import * as exampleServer from "example"
import type * as exampleClient from "example"
import { components } from "docs"

console.log(components)
const DocTest2 = components.DocTest

const primLocal = createPrimClient({ server: true }, exampleServer)
const expectedMessage = ref("")
const exampleArgs = { greeting: "Hey", name: "Ted" }
const host = import.meta.env.VITE_HOST
const { sayHello, typeMessage } = createPrimClient<typeof exampleClient>({
	endpoint: `https://api.${host}/prim`,
	clientBatchTime: 10
})
const message = ref<string>()
const matches = computed(() => message.value === expectedMessage.value)
const errored = computed(() => message.value === "errored")
const typedMessage = ref<string[]>([])
onMounted(async () => {
	try {
		message.value = await sayHello(exampleArgs)
		expectedMessage.value = await primLocal.sayHello(exampleArgs)
	} catch (error) {
		message.value = "errored"
	}
	typeMessage(message.value, (letter) => {
		console.log(letter)
		typedMessage.value.push(letter)
	}, 100)
})
</script>

<template>
  <div class="greeting">
    <DocTest2 />
    <hello-you
      :message="typedMessage.join('')"
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

.greeting {
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
