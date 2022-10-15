/** @jsxImportSource @builder.io/mitosis */

type Props = {
	name: string;
}

export default function MyTestComp(props: Props) {
	return (
		<div onClick={(event) => { console.log(event) }} style={{ color: "blue" }}>
			Hello {props.name ?? "you"}!
		</div>
	)
}
