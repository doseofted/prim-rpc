<template>
	<div>Test Docs</div>
</template>

<script lang="ts" setup>
const props = defineProps<{
	docs?: unknown
}>()

console.log(props.docs)
</script>
