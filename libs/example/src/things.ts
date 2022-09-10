export interface ThingInstance { id: number, name: string }
export class Things {
	things: ThingInstance[]
	create(thing: ThingInstance) {
		this.things.push(thing)
		return true
	}
	find(id: ThingInstance["id"]) {
		return this.things.find(thing => thing.id === id)
	}
	update(id: ThingInstance["id"], props: Partial<ThingInstance>) {
		const index = this.things.findIndex(thing => thing.id === id)
		const thing = this.things[index]
		if (!thing) { return }
		this.things[index] = { ...thing, ...props, id: thing.id }
		return thing
	}
	remove(id: ThingInstance["id"]) {
		const index = this.things.findIndex(thing => thing.id === id)
		const thing = this.things[index]
		if (!thing) { return }
		this.things.splice(index, 1)
		return true
	}
}
const things = new Things()

/**
 * Work on things.
 */
export default things
