<template>
	<div class="w-full h-full">
		<canvas
			ref="canvas"
			class="w-full h-full"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue"
import { CanvasSpace, Circle } from "pts"

export default defineComponent({
	setup() {
		// ...
		const canvas = ref<HTMLCanvasElement|null>(null)
		onMounted(() => {
			if (!canvas.value) { return }
			const space = new CanvasSpace(canvas.value)
				.setup({ bgcolor: "#000000", resize: true })
				.bindMouse()
			const form = space.getForm()
			space.add(() => {
				const circle = Circle.fromCenter(
					space.size.multiply(0.5),
					(space.width < space.height ? space.width : space.height) / 2
				)
				form.fillOnly("#ffffff").circle(circle)
				form.fillOnly("#000000").point(space.pointer, 10 )
			})
			space.play().bindMouse().bindTouch()
		})
		return { canvas }
	}
})
</script>
