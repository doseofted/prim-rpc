import { prim } from "./index"
import * as example from "example"

test("test only", () => {
	const primmed = prim(example)
	expect(primmed).toBeTruthy()
	/* expect(typeof prim({
		hello: (name: string) => `Hello ${name}`
	}) === "function") */
})
