// import * as example from "@doseofted/prim-example"
import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { test, expect } from "vitest"
import { createDocsForModule, helpers } from "./"

test("Basic documentation structure to be generated", () => {
	const docs = createDocsForModule(exampleDocs)
	// console.log(JSON.stringify(docs.props, null, "  "))
	console.log(helpers.iterateDocs(docs, "methods", docs.props?.testLevel2 ?? docs, false))
	expect(docs).toBeTypeOf("object")
	expect(docs).toHaveProperty("docs")
	expect(docs).toHaveProperty("props")
	expect(docs).toHaveProperty("methods")
	expect(docs).toHaveProperty("modules")
})

// test("Generated documentation should follow module structure", () => {
// 	const docs = createDocsForModule(exampleDocs)
// 	// console.log(JSON.stringify(docs.props, null, "  "))
// 	function findFunctions(given: Record<string, unknown>) {
// 		Object.entries(given)
// 	}
// 	findFunctions(example)
// 	console.log(docs)
// })
