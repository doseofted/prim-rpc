import exampleDocs from "@doseofted/prim-example/dist/docs.json"
import { parseModule } from "./index"
import { test, expect } from "vitest"

test("Parse module", () => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
	const parsed = parseModule(exampleDocs as any)
	console.log(JSON.stringify(parsed, null, "  "))
	expect(parsed).not.toBeNull()
})
