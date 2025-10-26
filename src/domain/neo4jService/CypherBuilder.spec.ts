import * as mockConfig from '../../shared/common/config/mockConfig';
import CypherBuilder from './CypherBuilder';

describe('CypherBuilder', () =>  {
	beforeAll(() => {
		mockConfig.init()
	});

	it ('Generate simple Query', () => {
		const builder = new CypherBuilder();

		builder.Merge().Node('Account', { id: 'abc' });
		const accountVar = builder.currentQuery?.varName;

		if (accountVar === undefined) {
			throw new Error('No variable name for Account.')
		}

		builder.Return(accountVar);

		const query = builder.build();
		expect(query).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })',
				variableName: 'a',
				props: {
					id: 'abc'
				},
			},
			{
				query: 'RETURN a',
				variableName: undefined,
				props: {
					varNames: ['a'],
				},
			},
		]);
	})
})