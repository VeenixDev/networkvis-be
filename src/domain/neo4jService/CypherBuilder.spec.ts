import * as mockConfig from '../../shared/common/config/mockConfig';
import CypherBuilder, { createRef } from './CypherBuilder';

describe('CypherBuilder', () =>  {
	beforeAll(() => {
		mockConfig.init()
	});

	it ('Generate simple Query', () => {
		const builder = new CypherBuilder();


		const accountVar = createRef('varname');
		const relationVar = createRef('varname');
		builder.Merge().Node('Account', { id: 'abc' }, { varRef: accountVar}).Relation('Bar', { id: 'def'}, { varRef: relationVar });

		if (accountVar === undefined) {
			throw new Error('No variable name for Account.')
		}
		if (relationVar === undefined) {
			throw new Error('No variable name for Relation.')
		}

		builder.Return(accountVar, relationVar);

		const query = builder.build();
		expect(query).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })-[b:Bar { id: $id__b }]->',
				variableNames: ['a', 'b'],
				props: {
					id__a: 'abc',
					id__b: 'def',
				},
			},
			{
				query: 'RETURN a, b',
				variableNames: [],
				props: {
					varNames: ['a', 'b'],
				},
			},
		]);
	})
})