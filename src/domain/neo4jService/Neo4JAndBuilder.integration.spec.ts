import * as mockConfig from '../../shared/common/config/mockConfig';
import Neo4J from './Neo4J';
import {
	createObjRef,
	createVarRef,
	Ref,
} from './Ref';
import CypherBuilder from './CypherBuilder';

type AccountProps = {
	id: string;
}

describe('Neo4J + Cypher Builder', () => {
	beforeAll(() => {
		mockConfig.init();
	});

	it ('Should generate valid Cypher with variable name ref', () => {
		const neo4j = new Neo4J();
		const builder = new CypherBuilder();

		const accountVar: Ref<'varname', AccountProps> = createVarRef<AccountProps>();

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

		const accountObj: Ref<'object', AccountProps> = createObjRef<AccountProps>();

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
			},
		]);
		expect(prepared).toEqual({
			query: 'MERGE (a:Account { id: $id__a })\nRETURN a',
			props: {
				id__a: 'abc'
			}
		});
	});

	it ('Should generate valid Cypher with ON CREATE SET', () => {
		const neo4j = new Neo4J();
		const builder = new CypherBuilder();

		const accountVar = createVarRef();
		builder.Merge().Node('Account', { id: 'abc' }, { varRef: accountVar }).OnCreate().Set(accountVar, { name: 'Max' }).Return(accountVar);

		const built = builder.build();
		const prepared = neo4j.prepareQueries(...built);

		expect(built).toEqual([
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
		expect(prepared).toEqual({
			query: 'MERGE (a:Account { id: $id__a })\nON CREATE SET a.name = $name__a\nRETURN a',
			props: {
				id__a: 'abc',
				name__a: 'Max',
			}
		})
	});
});