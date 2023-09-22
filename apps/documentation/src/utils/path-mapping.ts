/**
 * Astro collections only allow for a single level of nesting and directories
 * do not yet allow existing metadata to be added (at least that I'm aware of).
 *
 * Metadata for path parts is stored here, mostly titles of sections.
 */
export const pathPartMapping = {
	"/v0": {
		title: "v0 (latest)",
	},
	"/v1": {
		title: "v1 (future)",
	},
	"/usage": {
		title: "Library Usage",
	},
	"/reference": {
		title: "Reference",
	},
	"/integrations": {
		title: "Integrations",
	},
}
