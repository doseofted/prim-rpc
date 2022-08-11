/* @refresh reload */
import { render } from "solid-js/web"
import App from "./components/App/App"
import "./index.css"
import "uno.css"
import "@unocss/reset/tailwind.css"

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
render(() => <App hello="Ted" />, document.getElementById("root") as HTMLElement)
