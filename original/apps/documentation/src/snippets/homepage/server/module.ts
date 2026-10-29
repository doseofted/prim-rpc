export function sayHello() {
	return "Hello world!"
}
// This property signals to Prim+RPC that this function can be exposed
sayHello.rpc = true
