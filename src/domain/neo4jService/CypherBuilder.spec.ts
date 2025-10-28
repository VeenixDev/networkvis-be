import * as mockConfig from '../../shared/common/config/mockConfig';
import CypherBuilder from './CypherBuilder';
import { createVarRef } from './Ref';

describe('CypherBuilder', () =>  {
	beforeAll(() => {
		mockConfig.init()
	});

	it ('Generate simple Query', () => {
		const builder = new CypherBuilder();


		const accountVar = createVarRef();
		const relationVar = createVarRef();
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
			},
		]);
	});

	it ('Generate Query with nameless Element', () => {
		const builder = new CypherBuilder();

		const accountVar = createVarRef();
		builder.Merge().Node('Account', { id: 'abc' }, { varRef: accountVar}).Relation('Bar', { id: 'def'});

		if (accountVar === undefined) {
			throw new Error('No variable name for Account.')
		}

		builder.Return(accountVar);

		const query = builder.build();
		expect(query).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })-[:Bar { id: $id__b }]->',
				variableNames: ['a', 'b'],
				props: {
					id__a: 'abc',
					id__b: 'def',
				},
			},
			{
				query: 'RETURN a',
				variableNames: [],
			},
		]);
	});

	it ('Generate Query with Set', () => {
		const builder = new CypherBuilder();

		const accountVar = createVarRef();
		builder.Merge().Node('Account', { id: 'abc' }, { varRef: accountVar }).OnCreate().Set(accountVar, { name: 'Max' }).Return(accountVar);

		const query = builder.build();

		expect(query).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })',
				variableNames: ['a'],
				props: {
					id__a: 'abc',
				}
			},
			{
				query: 'ON CREATE SET a.name = $name__a',
				props: {
					name__a: 'Max',
				},
				variableNames: [],
			},
			{
				query: 'RETURN a',
				variableNames: [],
			}
		]);
	});
});