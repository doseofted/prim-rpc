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
import { CanvasSpace, Circle, Color, CanvasForm, Pt, GroupLike, Rectangle } from "pts"

export default defineComponent({
	setup() {
		// ...
		const canvas = ref<HTMLCanvasElement|null>(null)
		onMounted(() => {
			if (!canvas.value) { return }
			const space = new CanvasSpace(canvas.value)
				.setup({ bgcolor: "#00385D", resize: true, retina: true })
				.bindMouse()
				.bindTouch()
			// const bg = space.getForm()
			const createOffsetRadialBgGradient = (
				form: CanvasForm,
				gradient: (area1: GroupLike, area2?: GroupLike | undefined) => CanvasGradient,
				distance: Pt,
				center: Pt
			) => {
				const offsetTranslate = center.map(c => c < 0 ? c * 2 : 0) as Pt
				const offsetReset = offsetTranslate.map(c => c * -1) as Pt
				space.ctx.translate(offsetTranslate[0], offsetTranslate[1])
				form.fill(gradient(
					Circle.fromCenter(center, distance[0]),
					Circle.fromCenter(center, distance[1])
				)).stroke("transparent").rect(space.innerBound)
				space.ctx.translate(offsetReset[0], offsetReset[1])
			}
			const createGradient = (form: CanvasForm, stops: string[]|[number, string][], center: Pt, length: number) => {
				const gradient = form.gradient(stops)
				const gradientDistance = new Pt(0, length)
				const gradientCenter = center
				createOffsetRadialBgGradient(form, gradient, gradientDistance, gradientCenter)
			}
			const form = new CanvasForm(space)
			space.add(() => {
				// NOTE: colors and composite mode given in Designer file
				const { width: w, height: h } = space
				/** top-left */
				const s = space.size.$add(space.pointer.$multiply(-1.5))
				/** contained */
				const c = w < h ? w : h
				const blueBegin = Color.fromHex("#007FD3")
				const blueEnd = Color.fromHex("#00385D"); blueEnd.alpha = 0
				// REFERENCE: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
				form.composite("source-over")
				createGradient(form, [blueBegin.rgba, blueEnd.rgba], s.$multiply(0, 0.2), c * 0.5)
				createGradient(form, [blueBegin.rgba, blueEnd.rgba], s.$multiply(0.4, 0.3), c * 0.5)
				form.composite("hard-light")
				const greenBegin = Color.fromHex("#22FF6C")
				const greenEnd = greenBegin.clone(); greenEnd.alpha = 0
				createGradient(form, [greenBegin.rgba, greenEnd.rgba], s.$multiply(0, 0.9), c * 0.65)
				const redBegin = Color.fromHex("#FF4314"); redBegin.alpha = 0.9
				const redEnd = redBegin.clone(); redEnd.alpha = 0
				createGradient(form, [redBegin.rgba, redEnd.rgba], s.$multiply(0.2, 0.15), c * 0.55)
				form.composite("lighten") // NOTE: color-dodge does not work in same way Designer does
				const orangeBegin = Color.fromHex("#FF7614"); orangeBegin.alpha = 0.7
				const orangeEnd = orangeBegin.clone(); orangeEnd.alpha = 0
				createGradient(form, [orangeBegin.rgba, orangeEnd.rgba], s.$multiply(0.25, 0.85), c * 0.65)
				createGradient(form, [orangeBegin.rgba, orangeEnd.rgba], s.$multiply(-0.2, 0.4), c * 0.65)
				form.composite("screen")
				const whiteBegin = Color.fromHex("#FFFFFF")
				const lightBlueEnd = Color.fromHex("#007FD3"); lightBlueEnd.alpha = 0
				createGradient(form, [whiteBegin.rgba, lightBlueEnd.rgba], s.$multiply(0.15, 1.1), c * 0.7)
				createGradient(form, [whiteBegin.rgba, lightBlueEnd.rgba], s.$multiply(0, 0.4), c * 0.7)
				form.composite("saturation")
				const saturate = Color.fromHex("#FF0505"); saturate.alpha = 0.42
				form.fillOnly(saturate.rgba).rect(Rectangle.fromTopLeft(new Pt(0, 0), w, h))
			})
			space.play()
		})
		return { canvas }
	}
})
</script>
