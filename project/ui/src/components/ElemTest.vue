<template>
	<div
		ref="container"
		class="lights"
	>
		<div
			v-for="(light, i) of lights"
			:key="i"
			:style="lightStyle(light)"
			class="light"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, unref, StyleValue } from "vue"
import { Handler, useMove } from "@vueuse/gesture"
import { Color } from "pts"

interface Light {
	stops: [string, string]
	center: Ref<[number, number]>|[number, number]
	size: number
	blend: string
}

export default defineComponent({
	setup() {
		const container = ref<HTMLElement>()
		const center = ref<[number, number]>([0, 0])
		const lights = ref<Light[]>([
			{ stops: ["#007FD3", "#00385D"], center, size: 0.5, blend: "normal" }, // blue
			{ stops: ["#007FD3", "#00385D"], center, size: 0.5, blend: "normal" }, // blue
			{ stops: ["#22FF6C", "#22FF6C"], center, size: 0.65, blend: "hard-light" }, // green
			{ stops: ["#FF4314", "#FF4314"], center, size: 0.55, blend: "hard-light" }, // red
			{ stops: ["#FF7614", "#FF7614"], center, size: 0.65, blend: "lighten" }, // orange
			{ stops: ["#FF7614", "#FF7614"], center, size: 0.65, blend: "lighten" }, // orange
			{ stops: ["#FFFFFF", "#007FD3"], center, size: 0.7, blend: "screen" }, // white-blue
			{ stops: ["#FFFFFF", "#007FD3"], center, size: 0.7, blend: "screen" }, // white-blue
		])
		const moveEvent: Handler<"move", PointerEvent> = ({ event: finger }) => {
			const { pageX, pageY } = finger
			center.value = [pageX, pageY]
		}
		useMove(moveEvent, { domTarget: container })
		return { lights, container }
	},
	methods: {
		lightStyle(light: Light) {
			const start = Color.fromHex(light.stops[0])
			const end = Color.fromHex(light.stops[1]); end.alpha = 0
			return {
				"--start": start.rgba,
				"--end": end.rgba,
				width: `${Math.round(light.size * 100)}vw`,
				height: `${Math.round(light.size * 100)}vw`,
				top: `${unref(light.center)[1]}px`,
				left: `${unref(light.center)[0]}px`,
				mixBlendMode: light.blend,
				isolation: "auto"
			} as StyleValue // NOTE: force cast to StyleValue since CSS vars aren't recognized but are valid
		}
	}
})
</script>

<style lang="scss" scoped>
.lights {
	@apply w-full h-full bg-black overflow-hidden;
}
.light {
	@apply absolute;
	--start: rgba(255, 255, 255, 1);
	--end: rgba(0, 0, 0, 0);
	background-image: radial-gradient(circle at center, var(--start), var(--end));
}
</style>
