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
import { CanvasSpace, Circle, Color, CanvasForm } from "pts"

export default defineComponent({
	setup() {
		// ...
		const canvas = ref<HTMLCanvasElement|null>(null)
		onMounted(() => {
			if (!canvas.value) { return }
			const space = new CanvasSpace(canvas.value)
				.setup({ bgcolor: "#00385D", resize: true })
				.bindMouse()
				.bindTouch()
			// const bg = space.getForm()
			const gradient1 = new CanvasForm(space).composite("source-over")
			const gradient2 = new CanvasForm(space).composite("source-over")
			space.add(() => {
				const { width: w, height: h } = space
				const center = space.pointer
				const mostShort = w < h ? w : h
				const one = Color.fromHex("#007FD3")
				const two = one.clone(); two.alpha = 0
				const gradient = gradient2.gradient([
					[0, one.rgba],
					[0.9, two.rgba]
				])
				// gradient1.fill(gradient(
				// 	Circle.fromCenter(center, 0),
				// 	Circle.fromCenter(center, mostShort / 2)
				// )).rect(space.innerBound)
				const offset = center.$subtract(300)
				space.ctx.translate(offset.x < 0 ? offset.x * 2: 0, offset.y < 0 ? offset.y * 2: 0)
				gradient2.fill(gradient(
					Circle.fromCenter(offset, 0),
					Circle.fromCenter(offset, mostShort / 2)
				)).stroke("transparent").rect(space.innerBound)
				space.ctx.translate(offset.x < 0 ? offset.x * -2: 0, offset.y < 0 ? offset.y * -2: 0)
				// space.ctx.resetTransform()
				gradient1
					.strokeOnly("#fff")
					.circle(Circle.fromCenter(center, mostShort / 2))
			})
			space.play()
		})
		return { canvas }
	}
})
</script>
