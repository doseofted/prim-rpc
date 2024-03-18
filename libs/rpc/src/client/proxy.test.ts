/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { expect, test } from "vitest"
import { promiseProxy } from "./proxy"

test("proxy", () => {
	const given = promiseProxy(r => r("lol"))
	void expect(given.test.what().haha.coolio()).resolves.toBe("lol")
})
