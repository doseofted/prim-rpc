import { prim } from "./index"
import * as example from "example"

test("test only", () => {
	const primmed = prim(example, {
		client: body => new Promise((r) => r(body.params))
	})
	expect(primmed).toBeTruthy()
	/* expect(typeof prim({
		hello: (name: string) => `Hello ${name}`
	}) === "function") */
})
