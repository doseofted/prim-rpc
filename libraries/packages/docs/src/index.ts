import DocTest2 from "./DocTest2"
import DocTest from "./DocTest.vue"


const components = { DocTest2, DocTest }
/**
 * A test
 */
export function docTest(greeting?: string, name?: string) {
	return `${greeting ?? "Hello"} ${name ?? "you"}!`
}

export { components }
