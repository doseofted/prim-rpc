// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import { RpcPlaceholder } from "../constants"

/**
 * Determine if given argument is a Blob or File (universal) or Buffer (Node)
 *
 * @param possiblyBinary - Maybe a binary-like object
 * @returns The binary given, otherwise `false`
 */
function isBinaryLike(possiblyBinary: unknown) {
	return (typeof Blob !== "undefined" && possiblyBinary instanceof Blob) ||
		(typeof Buffer !== "undefined" && possiblyBinary instanceof Buffer)
		? possiblyBinary
		: false
}

export function blobIdentifier(given: unknown) {
	if (isBinaryLike(given)) return RpcPlaceholder.BinaryPrefix
}

/**
 * Determine if given argument is form-like
 *
 * @param maybeForm - FormData, FormElement containing FormData, or SubmitEvent (whose target is a FormElement with FormData)
 * @returns Boolean if given is a form-like object
 */
export function givenFormLike(maybeForm: unknown): maybeForm is HTMLFormElement | FormData | SubmitEvent {
	return (
		(typeof HTMLFormElement === "function" && maybeForm instanceof HTMLFormElement) ||
		(typeof FormData === "function" && maybeForm instanceof FormData) ||
		(typeof SubmitEvent === "function" && maybeForm instanceof SubmitEvent)
	)
}

/**
 * Turn `FormData` into an object of a similar structure. Given a form-like
 * object that can be used to reference `FormData`, extract the data from it
 * into an object. If given a `SubmitEvent`, prevent page navigation since the
 * event should be handled by this library.
 */
export function handlePossibleForm(form: HTMLFormElement | FormData | SubmitEvent) {
	if (form instanceof SubmitEvent && form.target instanceof HTMLFormElement) {
		form.preventDefault()
	}
	const formData =
		form instanceof HTMLFormElement
			? new FormData(form)
			: form instanceof SubmitEvent
				? form.target instanceof HTMLFormElement
					? new FormData(form.target)
					: undefined
				: form
	const data: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
	for (const [key, val] of formData) {
		if (data[key]) {
			const previous = data[key]
			if (Array.isArray(previous)) {
				previous.push(val)
			} else {
				data[key] = [previous, val]
			}
		} else {
			data[key] = val
		}
	}
	return data
}
