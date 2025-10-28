import neo4j, { QueryResult } from 'neo4j-driver';
import { Config } from '../../shared/common/config/config';
import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
type VarGenerator = () => string;

type IntermediateQueryResult = {
	query: string;
	variableNames: string[];
	props?: IndexedObject;
};
type PreparedQuery = { query: string; props: IndexedObject };

// TODO: Update to use a facade instead of noe4j directly.
// TODO: Implement Facade for neo4j
class Neo4J {
	public readonly driver;

	constructor() {
		const config = Config.instance.config;

		this.driver = neo4j.driver(
			`bolt://${config.neo4j.host}:${config.neo4j.port}`,
			neo4j.auth.basic(config.neo4j.auth.username, config.neo4j.auth.password)
		);
	}

	public async close(): Promise<void> {
		await this.driver.close();
	}

	// TODO: Add support for typed response
	public async execute(query: PreparedQuery): Promise<QueryResult> {
		const session = this.driver.session();
		try {
			return await session.run(query.query, query.props);
		} catch (error) {
			throw error;
		} finally {
			session.close();
		}
	}

	public prepareQueries(...queries: IntermediateQueryResult[]): PreparedQuery {
		const usedVariableNames: string[] = [];
		let query = '';
		let params: IndexedObject = {};

		for (const item of queries) {
			const hasVariable = item.variableNames.length > 0;
			if (hasVariable) {
				// Add and check all variable names
				for (const variableName of item.variableNames) {
					if (usedVariableNames.includes(variableName)) {
						throw new Error('Duplicate variable name. Cannot proceed safely.');
					}
					usedVariableNames.push(variableName!);
				}
			}
			if (Object.keys(item.props ?? {}).length > 0) {
				// Add and check all props
				for (const [propName, propValue] of Object.entries(item.props ?? {})) {
					if (params[propName] !== undefined) {
						throw new Error('Duplicate property name. Cannot proceed safely.');
					}
					params[propName] = propValue;
				}
			}

			query += `\n${item.query}`;
		}

		return { query: query.trim(), props: params };
	}

	public static getVarGenerator(): VarGenerator {
		// prettier-ignore
		const viableSymbols = Object.freeze([
			'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
			'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
			'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',	'O', 'P', 'Q', 'R', 'S',
			'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		]);
		let counter = 0;
		const base = viableSymbols.length;

		return () => {
			let n = counter + 1;
			let varName = '';
			while (n > 0) {
				n--;
				const digit = viableSymbols[n % base];
				varName = digit + varName;
				n = Math.floor(n / base);
			}
			counter++;
			return varName;
		};
	}
}

export default Neo4J;
export type {
	IntermediateQueryResult,
	VarGenerator,
	PreparedQuery
}
