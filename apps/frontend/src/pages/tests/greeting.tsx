import { GetStaticProps } from "next"
import backend from "../../prim-client"

interface Props {
	message: string
}

export const getStaticProps: GetStaticProps<Props> = async function (ctx) {
	// NOTE: docs are now static (but turn back into server-side props if no longer the case)
	const name = "Ted" // ctx.query?.name ? String(ctx.query.name) : undefined
	// const message = await backend.sayHello({ name })
	return {
		props: { message: `Hello ${name}!` },
	}
}

function Greeting(props: Props) {
	return <div>{props.message}</div>
}

export default Greeting
