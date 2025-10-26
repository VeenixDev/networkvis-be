import { Result, resultFromError } from './result';

const testError = new Error('Test error');

describe('Test Result helper', () => {
	describe('Create Result for each possible way', () => {
		it('Should create Result with value and without error via constructor', () => {
			const res: Result<number, Error> = new Result<number, Error>(1, null);

			expect(res.error).toBeNull();
			expect(res.value).toBe(1);
			expect(res.isError).toBeFalsy();
		});

		it('Should create Result with error and without value via constructor', () => {
			const res: Result<number, Error> = new Result<number, Error>(
				null,
				testError
			);

			expect(res.error).toBe(testError);
			expect(res.value).toBeNull();
			expect(res.isError).toBeTruthy();
		});

		it('Should create Result with error and without value via resultFromError function with an error', () => {
			const res: Result<number, Error> = resultFromError(testError);

			expect(res.error).toBe(testError);
			expect(res.value).toBeNull();
			expect(res.isError).toBeTruthy();
		});

		it('Should create Result with error and without value via resultFromError function with an error', () => {
			const res: Result<number, Error> = resultFromError('Test error');

			expect(res.error).toEqual(testError);
			expect(res.value).toBeNull();
			expect(res.isError).toBeTruthy();
		});
	});
});
