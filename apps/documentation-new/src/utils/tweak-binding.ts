/** Run given function on property set, useful for Tweakpane usage outside of animation loop */
export function watchGiven<T extends Record<string, unknown>>(
	given: T,
	setCb: (key: string, value: unknown) => void,
	init = true
) {
	if (init) {
		for (const [key, val] of Object.entries(given)) {
			setCb(key, val)
		}
	}
	const proxiedObject = new Proxy(given, {
		set: (target: Record<string, unknown>, key: string, value) => {
			target[key] = value
			setCb(key, value)
			return true
		},
	})
	return proxiedObject as T
}
