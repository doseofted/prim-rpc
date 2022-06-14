import PrimHello from "./components/PrimHello.vue"
import { generateTsDocs } from "./playground"

// console.table(generateJsDocs())
console.clear()
console.log(JSON.stringify(generateTsDocs(), null, "\t"))

export { PrimHello }
