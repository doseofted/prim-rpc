import { atom } from "nanostores"

/** True once navigation has happened, saved for the session */
export const $navigationHappened = atom(!!localStorage.getItem("navigationHappened"))

document.addEventListener(
	"astro:page-load",
	() => {
		$navigationHappened.set(true)
	},
	{ once: true }
)

$navigationHappened.subscribe(navigated => {
	localStorage.setItem("navigationHappened", JSON.stringify(navigated))
})
