/* @refresh reload */
import { render } from "solid-js/web"
import "./index.css"
import "uno.css"
import "@unocss/reset/tailwind.css"
import { Router, useRoutes } from "@solidjs/router"
import { MetaProvider } from "@solidjs/meta"
import pages from "~solid-pages"

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
render(
	() => {
		const Routes = useRoutes(pages)
		return (
			<MetaProvider>
				<Router>
					<Routes />
				</Router>
			</MetaProvider>
		)
	},
	document.getElementById("root") as HTMLElement,
)
