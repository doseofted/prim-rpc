import PrimHello from "./components/PrimHello.ce.vue"
import { defineCustomElement } from "vue"

function setupComponents () {
	customElements.define("prim-hello", defineCustomElement(PrimHello))
}

export { PrimHello, setupComponents }
