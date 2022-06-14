<script setup lang="ts">
withDefaults(defineProps<{
	message: string
}>(), {
	message: "loading"
})
</script>

<template>
  <p
    class="test"
  >
    {{ message }}
  </p>
</template>

<style>
.test {
	font-family:
		-apple-system,
		BlinkMacSystemFont,
		"Segoe UI",
		Roboto,
		Oxygen,
		Ubuntu,
		Cantarell,
		"Open Sans",
		"Helvetica Neue",
		sans-serif;
	font-weight: 600;
	font-size: 18px;
}
</style>