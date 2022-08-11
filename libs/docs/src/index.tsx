/* @refresh reload */
import { render } from "solid-js/web"
import App from "./components/App/App"
import "./index.css"
import "uno.css"
import "@unocss/reset/tailwind.css"
import { JSX } from "solid-js"
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
render(() => <App hello="Ted" /> as JSX.Element, document.getElementById("root") as HTMLElement)
