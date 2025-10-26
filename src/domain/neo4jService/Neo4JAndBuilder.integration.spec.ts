import * as mockConfig from '../../shared/common/config/mockConfig';
import Neo4J from './Neo4J';
import CypherBuilder, { createRef, Ref } from './CypherBuilder';

describe('Neo4J + Cypher Builder', () => {
	beforeAll(() => {
		mockConfig.init();
	});

	it ('Should generate valid Cypher with variable name ref', () => {
		const neo4j = new Neo4J();
		const builder = new CypherBuilder();

		const accountVar: Ref<'varname'> = createRef('varname');

		builder.Merge().Node('Account', { id: 'abc' }, { varRef: accountVar });

		if (!accountVar.value) {
			throw new Error('No variable name for Account.');
		}

		builder.Return(accountVar);

		const built = builder.build();
		const prepared = neo4j.prepareQueries(...built);

		expect(built).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })',
				props: {
					id__a: 'abc'
				},
				variableNames: ['a'],
			},
			{
				query: 'RETURN a',
				variableNames: [],
				props: {
					varNames: ['a'],
				},
			},
		]);
		expect(prepared).toEqual({
			query: 'MERGE (a:Account { id: $id__a })\nRETURN a',
			props: {
				id__a: 'abc'
			}
		});
	});

	it ('Should generate valid Cypher with object ref', () => {
		const neo4j = new Neo4J();
		const builder = new CypherBuilder();

		const accountObj: Ref<'object'> = createRef('object');

		builder.Merge().Node('Account', { id: 'abc' }, { objRef: accountObj });

		if (!accountObj.value) {
			throw new Error('No variable name for Account.');
		}

		builder.Return(accountObj);

		const built = builder.build();
		const prepared = neo4j.prepareQueries(...built);

		expect(built).toEqual([
			{
				query: 'MERGE (a:Account { id: $id__a })',
				props: {
					id__a: 'abc'
				},
				variableNames: ['a'],
			},
			{
				query: 'RETURN a',
				variableNames: [],
				props: {
					varNames: ['a'],
				},
			},
		]);
		expect(prepared).toEqual({
			query: 'MERGE (a:Account { id: $id__a })\nRETURN a',
			props: {
				id__a: 'abc'
			}
		});
	});
});