import { Component } from "solid-js"
import Docs from "../components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"

const Index: Component = () => {
	return (
		<Docs docs={docs} />
	)
}

export default Index
