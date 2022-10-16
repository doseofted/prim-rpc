/* @refresh reload */
import { render } from "solid-js/web"
import { Router, useRoutes } from "@solidjs/router"
import routes from "~solid-pages"
import "uno.css"
import "@unocss/reset/tailwind.css"

render(() => {
	const Routes = useRoutes(routes)
	return (
		<Router>
			<Routes />
		</Router>
	)
}, document.getElementById("root") as HTMLElement)
