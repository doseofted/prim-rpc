export function hi() {
	console.log("hi!")
}
hi.rpc = true

export function bonjour() {
	function hi() {
		console.log("hello")
	}
	hi.rpc = true
}

export const test = () => "lol"
test.rpc = true

export const func = function () {
	console.log("uhm")
}
func.rpc = true

export { hi as hello } from "./imported"
export const hola = await import("./imported")
