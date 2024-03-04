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

// "rpc" import attribute may be requirement for readability
import { hi as hello } from "./imported" with { type: "rpc" }
export const hola = await import("./imported")
export { hello }

import testModule from "virtual:prim-rpc?module=inline"
import client from "virtual:prim-rpc?client=true"

console.log({ testModule, client })
