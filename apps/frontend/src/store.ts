import { proxy } from "valtio"

export const websiteState = proxy({
	/**
	 * The `<Lights />` component can become intense on system resources in development.
	 * Toggle them on in development when they're actively being worked on.
	 */
	useLightEffect: true || process.env.NODE_ENV === "production",
})

async function setUpDevTools() {
	if (process.env.NODE_ENV === "production") {
		return
	}
	const { devtools } = await import("valtio/utils")
	devtools(websiteState, { name: "website", enabled: true })
}
void setUpDevTools()
