import { GetServerSideProps } from "next"
import backend from "../../client"

interface Props {
	message: string
}

export const getServerSideProps: GetServerSideProps<Props> = async function (ctx) {
	const greeting = ctx.query?.greeting ? String(ctx.query.greeting) : undefined
	const name = ctx.query?.name ? String(ctx.query.name) : undefined
	const message = await backend.sayHello({ greeting, name })
	return {
		props: { message },
	}
}

function Greeting(props: Props) {
	return <div>{props.message}</div>
}

export default Greeting
