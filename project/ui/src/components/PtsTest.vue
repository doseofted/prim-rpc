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
				.setup({ bgcolor: "#00385D", resize: true })
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
			const form1 = new CanvasForm(space).composite("source-over")
			const form3 = new CanvasForm(space).composite("hard-light")
			const form4 = new CanvasForm(space).composite("hard-light")
			const form5 = new CanvasForm(space).composite("color-dodge")
			const form6 = new CanvasForm(space).composite("screen")
			const form7 = new CanvasForm(space).composite("saturation")
			space.add(() => {
				const { width: w, height: h } = space
				const center = space.pointer
				const mostShort = w < h ? w : h
				const one = Color.fromHex("#007FD3")
				const two = one.clone(); two.alpha = 0
				createGradient(form1, [one.rgba, two.rgba], center.$subtract(0, -100), mostShort / 2)
				createGradient(form1, [one.rgba, two.rgba], center.$subtract(-400, -300), mostShort / 2)
				createGradient(form3, ["#22FF6C", two.rgba], center.$subtract(0, -600), mostShort / 1)
				createGradient(form4, ["#FF4314", two.rgba], center.$subtract(-300, -200), mostShort / 1)
				createGradient(form5, ["#FF7614", two.rgba], center.$subtract(-200, -500), mostShort / 2)
				createGradient(form5, ["#FF7614", two.rgba], center.$subtract(100, -200), mostShort / 2)
				createGradient(form6, ["#FFFFFF", two.rgba], center.$subtract(-200, -600), mostShort / 1)
				createGradient(form6, ["#FFFFFF", two.rgba], center.$subtract(0, -200), mostShort / 3)
				const saturate = Color.fromHex("#FF0505"); saturate.alpha = 0.42
				form7.fillOnly(saturate.rgba).rect(Rectangle.fromTopLeft(new Pt(0, 0), w, h))
				// form1.strokeOnly("#fff").circle(Circle.fromCenter(center, mostShort / 2))
			})
			space.play()
		})
		return { canvas }
	}
})
</script>
