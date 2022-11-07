// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const module = import.meta.glob("../generated/react/src/components/**", { eager: true })
import "./style.css"

export default module
