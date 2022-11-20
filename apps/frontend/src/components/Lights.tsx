import { createContext, Dispatch, useContext, useEffect, useMemo, useReducer, useState } from "react"
import { useEffectOnce } from "react-use"
import { useImmerReducer } from "use-immer"
import { nanoid } from "nanoid"
type LightsState = {
	lights: { id: string }[]
}
type LightsDispatch = { type: "hi"; what: string } | { type: "bye"; okay: string }
type LightsContext = [LightsState, Dispatch<LightsDispatch>]
const LightsContext = createContext<null | LightsContext>(null)
function useLights() {
	const ctx = useContext(LightsContext)
	if (!ctx) {
		throw new Error("Lights context must be used in Lights component.")
	}
	return ctx
}

export interface LightsProps {
	children?: React.ReactNode | React.ReactNode[]
}
export function Lights(props: LightsProps) {
	const { children } = props
	const [state, dispatch] = useImmerReducer<LightsState, LightsDispatch>(
		(state, action) => {
			switch (action.type) {
				case "hi": {
					state.lights.push({ id: action.what })
					break
				}
				case "bye": {
					break
				}
				default: {
					break
				}
			}
		},
		{ lights: [] }
	)
	useEffect(() => {
		console.log("state updated", state.lights)
	}, [state.lights])
	const ctx = useMemo(() => [state, dispatch] as LightsContext, [state, dispatch])
	return <LightsContext.Provider value={ctx}>{children}</LightsContext.Provider>
}

export interface LightProps {
	children?: React.ReactNode | React.ReactNode[]
}
export function Light(props: LightsProps) {
	const [id] = useState(nanoid())
	const [ctx, dispatch] = useLights()
	const test = id
	useEffect(() => {
		console.log(id, test)
		dispatch({ type: "hi", what: "you" })
	}, [id])
	const { children } = props
	return (
		<>
			{ctx.lights.length}
			{children}
		</>
	)
}
