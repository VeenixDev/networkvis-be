import Neo4J from './Neo4J';
import * as mockConfig from '../../shared/common/config/mockConfig';
import { IndexedObject } from '../../shared/common/helpers/typeHelpers';

describe('Neo4J', () => {
	beforeAll(() => {
		mockConfig.init();
	})

	it ('Should generate variableName', () => {
		const varGenerator = Neo4J.getVarGenerator();

		const varName1 = varGenerator();
		const varName2 = varGenerator();
		const varName3 = varGenerator();

		expect(varName1).toEqual('a');
		expect(varName2).toEqual('b');
		expect(varName3).toEqual('c');
	});

	it ('Should generate multi letter variable name', () => {
		const varGenerator = Neo4J.getVarGenerator();

		const varName1 = varGenerator();

		for(let i = 0; i < 51; i++) {
			varGenerator();
		}
		const varName2 = varGenerator();
		const varName3 = varGenerator();

		expect(varName1).toEqual('a');
		expect(varName2).toEqual('aa');
		expect(varName3).toEqual('ab');
	});

	it ('Should generate prepared query', () => {
		const neo4j = new Neo4J();
		const varGenerator = Neo4J.getVarGenerator();
		const varName1 = varGenerator();
		const query1 = `MERGE (${varName1}:Foo { id: $id__${varName1} }) ON CREATE SET ${varName1}.name=$name__${varName1}, ${varName1}.createdAt = timestamp()`;

		const varName2 = varGenerator();
		const query2 = `MERGE (${varName2}:Bar { id: $id__${varName2} }) ON CREATE SET ${varName2}.createdAt = timestamp()`;

		const preparedQuery = neo4j.prepareQueries({ query: query1, variableNames: [varName1], props: { [`name__${varName1}`]: 'Test Name 1', [`id__${varName1}`]: '1'}}, { query: query2, variableNames: [varName2], props: { [`id__${varName2}`]: '2'}});
		const preparedParams = preparedQuery.props;
		expect(preparedQuery.query).toEqual(`MERGE (a:Foo { id: $id__a }) ON CREATE SET a.name=$name__a, a.createdAt = timestamp()\nMERGE (b:Bar { id: $id__b }) ON CREATE SET b.createdAt = timestamp()`);
		expect(preparedParams).toEqual({
			id__a: '1',
			name__a: 'Test Name 1',
			id__b: '2'
		});
	});

	it ('Should generate prepared query with multiple variable names', () => {
		const neo4j = new Neo4J();
		const varGenerator = Neo4J.getVarGenerator();
		const varName1 = varGenerator();
		const varName2 = varGenerator();
		const query1 = `MATCH (${varName1}:Foo { id: $id__${varName1} }) MATCH (${varName2}:Bar { id: $id__${varName2} }) RETURN ${varName1}, ${varName2}`;

		const props: IndexedObject = {
			[`id__${varName1}`]: 'abc',
			[`id__${varName2}`]: 'def'
		}

		const preparedQuery = neo4j.prepareQueries({ query: query1, variableNames: [varName1, varName2], props });
		const preparedParams = preparedQuery.props;
		expect(preparedQuery.query).toEqual(`MATCH (a:Foo { id: $id__a }) MATCH (b:Bar { id: $id__b }) RETURN a, b`);
		expect(preparedParams).toEqual({
			id__a: 'abc',
			id__b: 'def'
		});
	})
});