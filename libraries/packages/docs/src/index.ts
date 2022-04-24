import { sayHelloAlternative } from "example"
import docs from "example/dist/main.doc.json"
import DocTest from "./components/DocTest.vue"

console.log(docs, DocTest, "41")

export async function createApp () {
	const test = await sayHelloAlternative("Hey", "Ted")
	return test
}

export { DocTest }
