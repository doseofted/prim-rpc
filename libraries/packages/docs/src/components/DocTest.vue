<template>
  <div>
    Hello {{ ted }}
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const ted = ref("Ted")
</script>
