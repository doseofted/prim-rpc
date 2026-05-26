import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["libs/*", "apps/*"],
	},
	server: {
		host: "0.0.0.0",
	},
});
