import * as example from "@doseofted/prim-example"
import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { test, expect } from "vitest"
import { get as getProperty } from "lodash-es"
import { createDocsForModule, helpers } from "./"
import { PrimModuleStructure } from "./interfaces"

test("Basic documentation structure can be generated", () => {
	const docs = createDocsForModule(exampleDocs)
	// console.log(JSON.stringify(docs, null, "  "))
	// console.log(helpers.iterateDocs(docs, "methods", docs.props?.testLevel2 ?? docs, false))
	expect(docs).toBeTypeOf("object")
	expect(docs).toHaveProperty("docs")
	expect(docs).toHaveProperty("props")
	expect(docs).toHaveProperty("methods")
	expect(docs).toHaveProperty("modules")
})

test("Generated documentation should follow module structure", () => {
	const docs = createDocsForModule(exampleDocs)
	function getFunctionPathsOfModule(given: unknown, path = "") {
		if (!given) { return [] }
		if (typeof given !== "object") { return [] }
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
	const foundDocReferences = functionPaths.map<PrimModuleStructure>(path => {
		return getProperty(docs, path.split(".").filter(given => given).flatMap(p => ["props", p])) as PrimModuleStructure
	}).filter(given => given)
	const foundDocs = foundDocReferences
		.map(reference => helpers.findDocsReference(docs, reference))
		.filter(given => given)
	const docPathsMatchModulePaths = foundDocs.map((doc, index) => {
		const docPath = doc?.path ?? ""
		const actualPath = functionPaths[index] ?? ""
		const actualPathFormatted = actualPath.split(".").filter(given => given).join("/")
		return docPath === actualPathFormatted
	}).reduce((p, n) => p && n, true)
	expect(functionPaths.length === foundDocReferences.length).toBeTruthy()
	expect(functionPaths.length === foundDocs.length).toBeTruthy()
	expect(docPathsMatchModulePaths).toBeTruthy()
})
