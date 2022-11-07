// import { Component } from "solid-js"
import Docs from "@react/components/Docs"
import docs from "@doseofted/prim-example/dist/docs.json"

const Index = () => {
	return (
		<div>
			{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
			<Docs docs={docs} />
		</div>
	)
}

export default Index
