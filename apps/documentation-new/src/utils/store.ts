import { atom } from "nanostores"

const navigationHappenedInitial =
	typeof sessionStorage !== "undefined" ? !!sessionStorage.getItem("navigationHappened") : false
/** True once navigation has happened, saved for the session */
export const $navigationHappened = atom(navigationHappenedInitial)
$navigationHappened.subscribe(navigated => {
	console.debug("navigation happened", navigated)
	if (typeof sessionStorage === "undefined") return
	sessionStorage.setItem("navigationHappened", JSON.stringify(navigated))
})
