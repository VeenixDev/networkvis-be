type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;
type IndexedObject<T = unknown> = { [key: string]: T };

export type { DeepPartial, IndexedObject };
