// NOTE: this file is not used yet but could be useful for other types of workers (this may be deleted later)

export enum PrimEvent {
	Connect = "prim-connect",
}

interface PrimEventDetail {
	[PrimEvent.Connect]: CustomEvent<{
		id: string
	}>
}

type PossibleContext = Window | Worker | SharedWorker | ServiceWorker

export function customDispatchEvent<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	data: Partial<PrimEventDetail[T]> & Pick<PrimEventDetail[T], "detail">
) {
	return parent.dispatchEvent(new CustomEvent(event, data))
}

export function customAddEventListener<T extends PrimEvent>(
	parent: PossibleContext,
	event: T,
	callback: (event: PrimEventDetail[T]) => void
) {
	return parent.addEventListener(event, e => {
		const event = e as PrimEventDetail[T]
		callback(event)
	})
}
