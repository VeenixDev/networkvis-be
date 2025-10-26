class Result<V, E> {
	readonly value: V | null;
	readonly error: E | null;

	constructor(value: V | null, error: E | null) {
		this.value = value;
		this.error = error;
	}

	public get isError(): boolean {
		return this.error !== null;
	}
}

class ErrorResult<V> extends Result<V, Error> {}

const resultFromError = <V>(error: unknown): Result<V, Error> => {
	if (error instanceof Error) {
		return new Result<V, Error>(null, error);
	}
	return new Result<V, Error>(null, new Error(error as string));
};

export { Result, ErrorResult, resultFromError };
