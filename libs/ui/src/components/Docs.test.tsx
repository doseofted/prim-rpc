import { describe, it } from "vitest"
import { render, screen } from "@testing-library/react"
// import matchers from "@testing-library/jest-dom"
import docs from "@doseofted/prim-example/dist/docs.json"
import Docs from "@react/components/Docs"

describe("Docs", () => {
	it("renders", () => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		render(<Docs docs={docs} />)
		// expect(screen.).toHaveTextContent("@doseofted/prim-example")
		screen.debug()
	})
})
