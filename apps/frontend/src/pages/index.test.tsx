import { describe, expect, test } from "vitest"
import { render } from "solid-testing-library"
import Index from "./index"

describe("<Index />", () => {
	test("it will render message", () => {
		const { unmount, container } = render(() => <Index />)
		const app = container.firstChild as HTMLDivElement
		expect(app.innerHTML).toContain("Hello")
		unmount()
	})
})
