import {
	createRouter as _createRouter,
	createMemoryHistory,
	createWebHistory,
	RouteRecordRaw,
} from "vue-router"

const pages = import.meta.glob("./pages/*.vue")
const routes = Object.keys(pages).map(path => {
	const name = path.match(/\.\/pages(.*)\.vue$/)?.[1].toLowerCase()
	return <RouteRecordRaw>{
		path: name === "/index" ? "/" : name,
		component: pages[path], // TODO: determine how to use dynamic import with routes
	}
})

export function createRouter() {
	const history = import.meta.env.SSR ? createMemoryHistory() : createWebHistory()
	return _createRouter({ history, routes })
}
