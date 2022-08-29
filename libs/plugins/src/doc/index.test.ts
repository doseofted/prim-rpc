import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { createDocsForModule } from "./index"
import { test, expect } from "vitest"

test("Parse module", () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
	const parsed = createDocsForModule(exampleDocs)
	console.log(JSON.stringify(parsed.shape, null, "  "))
	expect(parsed).not.toBeNull()
})
