/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { expect, test } from "vitest"
import { createMethodCatcher } from "./proxy"

test("proxy", async () => {
	const given = createMethodCatcher()
	console.log("result", await given.select.from("users").where("id", "=", 1).execute())
	console.log("result", await given.select.from("users"))
	// void expect().toBe({})
})
