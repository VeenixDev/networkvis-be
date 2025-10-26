import Neo4J from './Neo4J';
import * as mockConfig from '../../shared/common/config/mockConfig';

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

		const preparedQuery = neo4j.prepareQueries({ query: query1, variableNames: varName1, props: { name: 'Test Name 1', id: '1'}}, { query: query2, variableNames: varName2, props: { id: '2'}});
		const preparedParams = preparedQuery.props;
		expect(preparedQuery.query).toEqual(`MERGE (a:Foo { id: $id__a }) ON CREATE SET a.name=$name__a, a.createdAt = timestamp()\nMERGE (b:Bar { id: $id__b }) ON CREATE SET b.createdAt = timestamp()`);
		expect(preparedParams).toEqual({
			id__a: '1',
			name__a: 'Test Name 1',
			id__b: '2'
		});
	});
});