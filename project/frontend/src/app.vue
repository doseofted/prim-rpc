<script setup lang="ts">
import HelloYou from './components/hello-you.vue'
</script>

<template>
  <div class="greeting">
    <hello-you name="you" />
  </div>
</template>

<style>
body { margin: 0; background-color: #dfdfdf; }

div {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
}
</style>
