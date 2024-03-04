declare module "virtual:prim-rpc?module=*" {
	const functions: {
		// NOTE: types aren't useful to the developer since function names are randomly generated at build time
		// [functionName: string]: (...args: unknown[]) => Promise<unknown>
	}
	export default functions
}

declare module "virtual:prim-rpc?client=true" {
	const client: {
		// NOTE: types aren't useful to the developer since function names are randomly generated at build time
	}
	export default client
}
