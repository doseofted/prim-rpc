import { useStore } from "@builder.io/mitosis"

type Props = {
	message: string;
}

export default function MyBasicComponent(props: Props) {
	const state = useStore({
		name: "you",
	})

	return (
		<div>
			{props.message || "Hello "} {state.name}!
		</div>
	)
}
