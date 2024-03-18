import type { RemoveFunctionWrapper, RemoveDynamicImport } from "../interfaces"

/**
 * Remove outer function and promise from given module (to support dynamic imports directly)
 */
export function removeModuleWrappers<T extends object>(given: T) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	given = given instanceof Function ? given() : given
	if (given instanceof Promise) {
		return given
	}
	return given as RemoveDynamicImport<RemoveFunctionWrapper<T>>
}
