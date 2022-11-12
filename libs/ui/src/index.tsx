/* @refresh reload */
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router, useRoutes } from "react-router-dom"
import routes from "~react-pages"

const App = () => {
	return <React.Suspense fallback={<p>Loading...</p>}>{useRoutes(routes)}</React.Suspense>
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Router>
			<App />
		</Router>
	</React.StrictMode>
)
