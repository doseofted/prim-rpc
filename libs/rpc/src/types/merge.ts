/** Merge two separate modules' methods into one. The second module will override the first as needed. */
export type MergeModuleMethods<
	ModuleGiven extends object,
	Override extends object = never,
	Keys extends keyof ModuleGiven = Extract<keyof ModuleGiven, string>,
> = [ModuleGiven] extends [never]
	? [Override] extends [never]
		? never
		: Override
	: {
			[Key in Keys]: Key extends keyof Override
				? Override[Key] extends (...args: unknown[]) => unknown
					? Override[Key]
					: Override[Key] extends object
						? ModuleGiven[Key] extends object
							? MergeModuleMethods<ModuleGiven[Key], Override[Key]>
							: Override[Key]
						: Override[Key]
				: ModuleGiven[Key]
		} & {
			[Key in Exclude<keyof Override, Keys>]: Override[Key]
		}
