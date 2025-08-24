import { castToOpaque, type Opaque } from "emery";

const CaughtIdSymbol: unique symbol = Symbol();
export type CaughtId = Opaque<number, typeof CaughtIdSymbol>;
export function createCaughtId(id: number) {
	return castToOpaque<CaughtId>(id);
}

export enum CaughtType {
	/** Property access */
	Prop = 1,
	/** Method calls */
	Call,
	/** Constructor calls */
	New,
}

export type CaughtBase = {
	id: CaughtId;
	path: PropertyKey[];
	type: CaughtType;
	chain?: CaughtId;
};

export type CaughtCall<Args extends unknown[] = unknown[]> = CaughtBase & {
	type: CaughtType.Call;
	args: Args;
};

export type CaughtProp = CaughtBase & {
	type: CaughtType.Prop;
};

export type CaughtNew<Args extends unknown[] = unknown[]> = CaughtBase & {
	type: CaughtType.New;
	args: Args;
};

export type Caught = CaughtCall | CaughtProp | CaughtNew;

export type CaughtStack = Caught[];
