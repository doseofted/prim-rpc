import { defineComponent, ref, h } from "vue"

const DocTest2 = defineComponent({
	setup() {
		const msg = ref("Ted")
		return () => h("div", h("p", msg))
	}
})

export default DocTest2
