<script lang="ts" setup>
import { ref } from "vue"
const test = ref("Ted")
</script>

<template>
  <div :style="{ fontSize: '40px' }">
    {{ test }}
  </div>
</template>
