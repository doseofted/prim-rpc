import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { createDocsForModule } from "./"
import { test, expect } from "vitest"
import { Type } from "@sinclair/typebox"

test("Parse module", () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
	const parsed = createDocsForModule(exampleDocs)
	// console.log(JSON.stringify(parsed.props, null, "  "))
	expect(parsed).not.toBeNull()
})

test("try typebox", () => {
	const fun = Type.String({ $id: "T", cool: true })
	const trying = Type.Union([Type.Boolean(), Type.Ref(fun)])
	console.log(JSON.stringify(trying))
})
