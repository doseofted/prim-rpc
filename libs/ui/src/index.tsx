/* @refresh reload */
import { StrictMode, Suspense } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter as Router, useRoutes } from "react-router-dom"
import routes from "~react-pages"

const App = () => {
	return <Suspense fallback={<p>Loading...</p>}>{useRoutes(routes)}</Suspense>
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<Router>
			<App />
		</Router>
	</StrictMode>
)
