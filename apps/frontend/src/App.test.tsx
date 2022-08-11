import { describe, expect, test } from "vitest"
import { render } from "solid-testing-library"
import App from "./App"

describe("<TestOnly />", () => {
	test("it will render message", () => {
		const { unmount, container } = render(() => <App />)
		const app = container.firstChild as HTMLDivElement
		expect(app.innerHTML).toContain("Hello")
		unmount()
	})
})
