/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { mount } from "@vue/test-utils"
import HelloWorld from "./HelloWorld.vue"

test("mount component", async () => {
	expect(HelloWorld).toBeTruthy()

	const wrapper = mount(HelloWorld, {
		props: {
			msg: "Ted",
		},
	})

	expect(wrapper.text()).toContain("Ted")

	await wrapper.get("button").trigger("click")

	expect(wrapper.text()).toContain("TedTed")

	await wrapper.get("button").trigger("click")

	expect(wrapper.text()).toContain("TedTedTed")
})
