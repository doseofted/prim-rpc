// Part of the Prim+RPC project ( https://prim.doseofted.me/ )
// Copyright 2023 Ted Klingenberg
// SPDX-License-Identifier: Apache-2.0

import * as example from "@doseofted/prim-example"
import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { test, expect } from "vitest"
import getProperty from "just-safe-get"
import { createDocsForModule, helpers } from "./"
import { PrimModuleStructure, PrimRpcDocs } from "./interfaces"

test("Basic documentation structure can be generated", () => {
	const docs = createDocsForModule(exampleDocs)
	console.log(JSON.stringify(docs.methods, null, "  "))
	expect(docs).toBeTypeOf("object")
	expect(docs).toHaveProperty("docs")
	expect(docs).toHaveProperty("props")
	expect(docs).toHaveProperty("methods")
	expect(docs).toHaveProperty("modules")
	function docsStructureCorrect(rootDocs: PrimRpcDocs, struct?: Partial<PrimRpcDocs>, level = 0): boolean {
		struct ??= docs
		const root = level === 0
		const docsRefCorrect =
			struct.docs &&
			typeof docs.docs[0] === "string" &&
			["methods", "modules"].includes(docs.docs[0]) &&
			typeof docs.docs[1] === "number"
		// console.log("  ".repeat(level), helpers.findDocsReference(rootDocs, struct.docs)?.name)
		const propsNotGiven = typeof struct.props === "undefined"
		if (struct.docs?.[0] === "methods" && propsNotGiven) {
			return !!(docsRefCorrect && propsNotGiven) // no need to go further if given a method
		}
		const propsCorrect =
			propsNotGiven ||
			(typeof struct.props === "object" &&
				Object.values(struct.props).map(childStruct => docsStructureCorrect(rootDocs, childStruct, level + 1)))
		const structureCorrect = !!(docsRefCorrect && propsCorrect)
		if (!root) {
			// console.log("  ".repeat(level), helpers.findDocsReference(rootDocs, struct.docs)?.name)
			return structureCorrect // don't check additional properties if not the root of documentation
		}
		const methodsCorrect =
			struct.methods
				?.map(
					method => typeof method.name === "string" && typeof method.path === "string" && method.signatures.length > 0
				)
				.reduce((p, n) => p && n, true) ?? false
		const modulesCorrect =
			struct.modules
				?.map(module => typeof module.name === "string" && typeof module.path === "string")
				.reduce((p, n) => p && n, true) ?? false
		return structureCorrect && methodsCorrect && modulesCorrect
	}
	const docsFollowStructure = docsStructureCorrect(docs)
	expect(docsFollowStructure).toBeTruthy()
})

test("Generated documentation should follow module structure", () => {
	const docs = createDocsForModule(exampleDocs)
	function getFunctionPathsOfModule(given: unknown, path = "") {
		if (!given) {
			return []
		}
		if (typeof given !== "object") {
			return []
		}
		const functions: string[] = []
		for (const [key, prop] of Object.entries(given)) {
			if (typeof prop === "function") {
				functions.push([path, key].join("."))
			}
			const found = getFunctionPathsOfModule(prop, [path, key].join("."))
			functions.push(...found)
		}
		return functions
	}
	const functionPaths = getFunctionPathsOfModule(example)
	const foundDocReferences = functionPaths
		.map<PrimModuleStructure>(path => {
			return getProperty(
				docs,
				path
					.split(".")
					.filter(given => given)
					.flatMap(p => ["props", p])
			) as PrimModuleStructure
		})
		.filter(given => given)
	const foundDocs = foundDocReferences
		.map(reference => helpers.findDocsReference(docs, reference))
		.filter(given => given)
	const docPathsMatchModulePaths = foundDocs
		.map((doc, index) => {
			const docPath = doc?.path ?? ""
			const actualPath = functionPaths[index] ?? ""
			const actualPathFormatted = actualPath
				.split(".")
				.filter(given => given)
				.join("/")
			return docPath === actualPathFormatted
		})
		.reduce((p, n) => p && n, true)
	expect(functionPaths.length === foundDocReferences.length).toBeTruthy()
	expect(functionPaths.length === foundDocs.length).toBeTruthy()
	expect(docPathsMatchModulePaths).toBeTruthy()
})
