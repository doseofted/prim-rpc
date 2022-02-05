<script setup lang="ts">
import { onMounted, ref, computed } from "vue"
import HelloYou from "./components/hello-you.vue"
import { createPrim } from "prim"
import * as exampleServer from "example"
import type * as exampleClient from "example"

const { sayHello, sayHelloAlternative } = createPrim<typeof exampleClient>({
	endpoint: `https://api.${import.meta.env.VITE_HOST}/json`
})

const message = ref<string>()
const matches = computed(() => message.value === exampleServer.sayHelloAlternative("Hey", "Ted"))
onMounted(async () => {
	message.value = await sayHello({greeting: "Hey", name: "Ted" })
	console.log(await sayHelloAlternative("Hey again", "Teed"));
})
</script>

<template>
  <div class="greeting">
    <hello-you
      :message="message"
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

.you.matches {
  color: #2aa;
}
</style>
