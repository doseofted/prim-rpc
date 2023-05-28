// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import type { JSONSchema7 } from "json-schema"

// NOTE: when adding a new "type", consider if it can be used as input on docs page
/** Primitive types and the "object" type */
export type BasicTypes = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "null" | "Object"
/** Object types that are commonly thought of as basic language constructs themselves (also, "unknown" where not implemented yet) */
export type CommonTypes = "Function" | "Array" | "unknown"
export interface PrimType {
	/** Type as given in JavaScript, including common objects */
	type: BasicTypes | CommonTypes
	/** Typed data given from TypeScript formatted as JSON Schema */
	typed?: JSONSchema7
}

export interface PrimComment {
	comment: string
}

export interface PrimMethod {
	name: string
	path: string
	signatures: PrimMethodSignature[]
	// method could have properties (like `.rpc`)
	// TODO: add props
	props?: {
		[prop: string]: PrimType
	}
}

export interface PrimParam extends PrimType, PrimComment {
	name: string
}
export interface PrimReturn extends PrimType, PrimComment {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PrimThrow extends PrimComment {}
export interface PrimMethodSignature extends PrimComment {
	params: PrimParam[]
	returns: PrimReturn
	throws: PrimThrow
	flags: {
		[flag: string]: boolean
	}
}

export interface PrimModule extends PrimComment {
	name: string
	path: string
	flags: {
		[flag: string]: boolean
	}
}

export type PrimRootStructureKeys = keyof Omit<PrimRpcDocs, "props" | "docs">
export interface PrimModuleStructure {
	docs: [key: PrimRootStructureKeys, index: number]
	props?: {
		[moduleOrMethodName: string]: PrimModuleStructure
	}
}

export interface PrimRpcDocs extends PrimModuleStructure {
	methods: PrimMethod[]
	modules: PrimModule[]
}
