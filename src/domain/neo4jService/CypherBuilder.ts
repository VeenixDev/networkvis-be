import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import Neo4J, { IntermediateQueryResult, VarGenerator } from './Neo4J';
import { Ref, RefType } from './Ref';
import { addNoQueryError, computeVariableNames } from './CypherHelper';
import {
	BuilderOptions,
	BuilderQueryTypes,
	BuilderWithOut,
	IntermediateBuilderQuery,
	MergeBuilder,
	OptionalBuilder,
	Props,
	SetBuilder,
	StatementPathBuilder,
	StatementStartBuilder,
	TerminalBuilder,
} from './BuilderTypes';
import { buildFragment } from './CypherGenerators';

class BaseBuilder {
	private readonly varGenerator: VarGenerator;
	// private readonly accessMap: Map<string, number>;

	private readonly queryList: IntermediateBuilderQuery[];
	private _currentQuery: IntermediateBuilderQuery | null;

	constructor() {
		// this.accessMap = new Map();
		this.queryList = [];
		this._currentQuery = null;
		this.varGenerator = Neo4J.getVarGenerator();
	}

	public set currentQuery(query: Ref<'object'>) {
		if (query.__isRef && query.refType === 'object' && query.value) {
			this._currentQuery = query.value as IntermediateBuilderQuery;
			return;
		}
		throw new Error('Either query is not a Ref or the value is undefined.');
	}

	public get currentQuery(): IntermediateBuilderQuery | null {
		return this._currentQuery;
	}

	public Match(): StatementPathBuilder {
		const type = BuilderQueryTypes.MATCH;
		const query: IntermediateBuilderQuery = {
			type,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public Merge(): MergeBuilder {
		const type = BuilderQueryTypes.MERGE;
		const query: IntermediateBuilderQuery = {
			type,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	// TODO: Implement return of specific props (Use _R from Ref)
	// TODO: Only allow for varNames in the form of refs
	public Return(...varNames: (string | Ref<RefType>)[]): TerminalBuilder {
		if (varNames.length === 0) {
			throw new Error('Cannot generate "Return" with no provided arguments.');
		}

		const type = BuilderQueryTypes.RETURN;
		const computedVarNames = computeVariableNames(varNames);

		const query: IntermediateBuilderQuery = {
			type,
			internalProps: {
				varNames: computedVarNames,
			},
			children: [],
		};

		this.queryList.push(query);
		return this;
	}

	// TODO: Add type safety by passing Property Type further down
	public Relation<T extends IndexedObject = IndexedObject>(
		label?: string,
		props?: Props<T>,
		options?: BuilderOptions
	): BuilderWithOut<'Relation', StatementPathBuilder> {
		if (!this._currentQuery) {
			throw addNoQueryError('Relation');
		}
		const type = BuilderQueryTypes.RELATION;

		let needsVar = options?.varRef || options?.objRef !== undefined;
		const varName = needsVar ? this.varGenerator() : undefined;

		const obj: IntermediateBuilderQuery = {
			type,
			label,
			varName,
			props,
			children: [],
		};

		this._currentQuery.children.push(obj);

		if (options) {
			if (options.varRef && varName) {
				options.varRef.value = varName;
			}
			if (options.objRef) {
				options.objRef.value = obj;
			}
		}

		return this;
	}

	// TODO: Add type safety by passing Property Type further down
	public Node<T extends IndexedObject = IndexedObject>(
		label?: string,
		props?: Props<T>,
		options?: BuilderOptions
	): BuilderWithOut<'Node', StatementPathBuilder> {
		if (!this._currentQuery) {
			throw addNoQueryError('Node');
		}

		let needsVar = options?.varRef || options?.objRef !== undefined;
		const type = BuilderQueryTypes.NODE;
		const varName = needsVar ? this.varGenerator() : undefined;

		const obj: IntermediateBuilderQuery = {
			type,
			label,
			props,
			varName,
			children: [],
		};

		this._currentQuery.children.push(obj);

		if (options) {
			if (options.varRef && varName) {
				options.varRef.value = varName;
			}
			if (options.objRef) {
				options.objRef.value = obj;
			}
		}

		return this;
	}

	public Optional(): OptionalBuilder {
		const query: IntermediateBuilderQuery = {
			type: BuilderQueryTypes.OPTIONAL,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public OnCreate(): SetBuilder {
		const query: IntermediateBuilderQuery = {
			type: BuilderQueryTypes.ON_CREATE,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public OnMatch(): SetBuilder {
		const query: IntermediateBuilderQuery = {
			type: BuilderQueryTypes.ON_MATCH,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public Set<T extends IndexedObject = IndexedObject>(ref: Ref<RefType>, props: T): StatementStartBuilder {
		const query: IntermediateBuilderQuery = {
			type: BuilderQueryTypes.SET,
			children: [],
			internalProps: {
				ref: ref,
				props: props
			}
		};

		if (this._currentQuery !== null && [BuilderQueryTypes.ON_CREATE, BuilderQueryTypes.ON_MATCH].includes(this._currentQuery.type)) {
			this._currentQuery.children.push(query);
		} else {
			this.queryList.push(query);
			this._currentQuery = query;
		}
		return this;
	}
	// TODO: Implement the rest of the Cypher keywords
	// TODO: Implement flow control functions (If, For, While, Break) with type-safe interfaces

	public build(): IntermediateQueryResult[] {
		const results: IntermediateQueryResult[] = [];

		for (const query of this.queryList) {
			const fragment = buildFragment(query, this.varGenerator);

			results.push({
				...fragment,
			});
		}

		return results;
	}
}

export default BaseBuilder;
