import { Dialog } from "@headlessui/react"
import { motion, AnimatePresence, Transition } from "framer-motion"
import { HTMLAttributes } from "react"

interface Props extends HTMLAttributes<HTMLDivElement> {
	open?: boolean
	onToggle?: (open: boolean) => void
	children?: React.ReactNode
	className?: string
}
/**
 * Generic modal to be used for navigation.
 *
 * **Note:** Modal will render to portal located at `#headlessui-portal-root`,
 * placed at end of `<Layout />` (see Headless UI workaround)
 */
export function Modal(props: Props) {
	const { open = false, className = "", onToggle, children, ...attrs } = props
	const transition: Transition = { duration: 0.3 }
	return (
		<AnimatePresence>
			{props.open && (
				<Dialog
					static
					key="modal"
					as={motion.div}
					open={open}
					onClose={() => onToggle?.(false)}
					initial="hide"
					animate="show"
					exit="hide">
					<motion.div
						className="fixed inset-0 bg-prim-space/60 backdrop-blur-sm"
						variants={{
							hide: {
								opacity: 0,
								transition,
							},
							show: {
								opacity: 1,
								transition,
							},
						}}
					/>
					<motion.div
						variants={{
							hide: {
								opacity: 0,
								y: 10,
								transition,
							},
							show: {
								opacity: 1,
								y: 0,
								transition,
							},
						}}
						className="fixed inset-0">
						<div {...attrs} className={["fixed inset-0 overflow-y-auto", className].join(" ")}>
							{children}
						</div>
					</motion.div>
				</Dialog>
			)}
		</AnimatePresence>
	)
}
