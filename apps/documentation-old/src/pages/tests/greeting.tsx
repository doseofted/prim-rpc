import { GetServerSideProps } from "next"
import { testingClient as backend } from "../../app/prim/client"

interface Props {
	message: string
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
	// NOTE: docs are now static (but turn back into server-side props if no longer the case)
	const name = ctx.query?.name ? String(ctx.query.name) : undefined
	const message = await backend.sayHello({ name })
	return {
		props: { message },
	}
}

function Greeting(props: Props) {
	return <div>{props.message}</div>
}

export default Greeting
