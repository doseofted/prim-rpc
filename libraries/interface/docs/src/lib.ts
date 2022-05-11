import PrimHello from "./components/PrimHello.ce.vue"
import { defineCustomElement } from "vue"
const elements = { PrimHello }

Object.entries(elements).forEach(([name, elem]) => {
	customElements.define(
		name.replace(/[A-Z]/g, (m, o) => (o > 0 ? "-" : "") + m.toLowerCase()),
		defineCustomElement(elem)
	)
})

export { PrimHello }
