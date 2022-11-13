import React from "react"
import { describe, it } from "vitest"
import { render, screen } from "@testing-library/react"
// import matchers from "@testing-library/jest-dom"
import docs from "@doseofted/prim-example/dist/docs.json"
import Docs from "@react/components/Docs"

describe("Docs", () => {
	it("renders", () => {
		render(<Docs docs={docs} />)
		// expect(screen.).toHaveTextContent("@doseofted/prim-example")
		screen.debug()
	})
})
