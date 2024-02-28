export function hi() {
	console.log("hi!")
}
hi.rpc = true

export function what() {
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
