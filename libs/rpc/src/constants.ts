import { nanoid } from "nanoid"

/** Placeholder names for extracted values from RPC */
export enum RpcPlaceholder {
	CallbackPrefix = "cb",
	BinaryPrefix = "bin",
	PromisePrefix = "prom",
}

export function placeholderName(type: RpcPlaceholder, id?: string) {
	return `_${type}_${id ?? nanoid()}`
}

export function placeholderOnly(given: RpcPlaceholder) {
	return placeholderName(given, "")
}
