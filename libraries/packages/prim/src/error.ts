export interface RpcErr<Data = unknown> {
	code: number
	message: string
	data?: Data
}

export class RpcError<T> extends Error implements RpcErr<T> {
	get code(): number { return this.err.code }
	get message(): string { return this.err.message }
	get data(): T | undefined { return this.err.data }
	get isRpcErr(): boolean { return !!this.err && this.message !== undefined && this.code !== undefined }

	formatSend(): RpcErr<T> {
		const { code, message, data } = this
		return { code, message, data }
	}

	constructor(private err?: RpcErr<T>) {
		super()
	}
}
