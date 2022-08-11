import { createSignal } from "solid-js"

const [mouse, setMouse] = createSignal({ x: 0, y: 0 })

export function useMouse() {
  function onMouseMove(event: MouseEvent) {
    const { x, y } = event
    setMouse({ x, y })
  }
  return { onMouseMove, mouse }
}