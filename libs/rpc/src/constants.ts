import { nanoid } from "nanoid"

export enum RpcPlaceholder {
	CallbackPrefix = "_cb_",
	BinaryPrefix = "_bin_",
	PromisePrefix = "_prom_",
}

export function placeholderName(type: RpcPlaceholder, id?: string) {
	return `${type}${id ?? nanoid()}`
}
