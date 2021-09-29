<template>
	<div class="flex justify-center items-center h-screen">
		<!-- <hello-world>Ted</hello-world> -->
		<canvas
			ref="canvas"
			class="w-full h-full"
			resize
		/>
	</div>
</template>

<script lang="tsx">
import { defineComponent, ref, onMounted } from "vue"
import { Project, Shape, Point, Color, Rectangle } from "paper/dist/paper-core"

export default defineComponent({
	setup() {
		const canvas = ref<HTMLCanvasElement|null>(null)
		onMounted(() => {
			if (!canvas.value) { return }
			const project = new Project(canvas.value)
			const draw = () => {
				project.clear()
				const { width, height } = project.view.viewSize
				const bg = new Shape.Rectangle(new Rectangle(new Point(0, 0), new Point(width, height)))
				bg.fillColor = new Color("#000000")
				const shape = new Shape.Circle(
					new Point(width / 2, height / 2),
					(width < height ? width : height) / 2
				)
				shape.fillColor = new Color("#ffffff")
			}
			project.view.on("resize", () => draw())
			draw()
		})
		return { canvas }
	}
})
</script>
