import ReactDOM from "react-dom/client"
import ReactComp from "./components/PrimTest/PrimTest.react"

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
ReactDOM.createRoot(document.getElementById("react") as HTMLElement).render(<ReactComp name="Ted" />)
