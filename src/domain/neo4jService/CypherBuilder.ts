import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import Neo4J, { IntermediateQueryResult, VarGenerator } from './Neo4J';

enum BuilderQueryTypes {
	MATCH = 'MATCH',
	MERGE = 'MERGE',
	RELATION = 'RELATION',
	NODE = 'NODE',
	OPTIONAL = 'OPTIONAL',
	RETURN = 'RETURN',
}

type IntermediateBuilderQuery = {
	type: string;
	varName?: string;
	label?: string;
	props?: IndexedObject;
	children: IntermediateBuilderQuery[];
};

type BuilderOptions = {
	varRef?: Ref<'varname'>;
	objRef?: Ref<'object'>;
};

type BuildFragment = {
	query: string;
	props?: IndexedObject;
	variableNames: string[];
};

// Builder Types for Fluent API
type StatementPathBuilder = Omit<BaseBuilder, 'Match' | 'Merge' | 'Optional'>;
type StatementStartBuilder = Omit<BaseBuilder, 'Node' | 'Relation' | 'Return'>;
type OptionalBuilder = Pick<BaseBuilder, 'Match' | 'Merge'>;
type BuilderWithOut<T extends keyof BaseBuilder, D = BaseBuilder> = Omit<D, T>;

type Props<T extends IndexedObject> = T;

const addNoQueryError = (type: string) =>
	new Error(`Cannot add "${type}", no query exits.`);

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
		if (query.__isRef && query.value) {
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

	public Merge(): StatementPathBuilder {
		const type = BuilderQueryTypes.MERGE;
		const query: IntermediateBuilderQuery = {
			type,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public Return(...varNames: (string | Ref<RefType>)[]): StatementStartBuilder {
		if (varNames.length === 0) {
			throw new Error('Cannot generate "Return" with no provided arguments.');
		}

		const type = BuilderQueryTypes.RETURN;
		const computedVarNames = varNames.map((v): string => {
			if (typeof v !== 'string' && (v as Ref<RefType>).__isRef) {
				const ref = v as Ref<RefType>;
				if (ref.value === null) {
					throw new Error('Ref cannot be empty.');
				}
				if (ref.refType === 'varname') {
					return ref.value as string;
				} else if (ref.refType === 'object') {
					const varName = (ref.value as IntermediateBuilderQuery).varName;
					if (varName === undefined) {
						throw new Error(
							'Cannot get variable name of object reference with no variable.'
						);
					}
					return varName;
				} else {
					throw new Error('Unknown ref type.');
				}
			} else if (typeof v === 'string') {
				return v;
			}
			throw new Error('Return does only accept either a string or a Ref.');
		});

		const query: IntermediateBuilderQuery = {
			type,
			props: {
				varNames: computedVarNames,
			},
			children: [],
		};

		this.queryList.push(query);
		return this;
	}

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

	public Optional(): BuilderWithOut<'Optional', OptionalBuilder> {
		const query = {
			type: BuilderQueryTypes.OPTIONAL,
			children: [],
		};

		this.queryList.push(query);
		this._currentQuery = query;

		return this;
	}

	public build(): IntermediateQueryResult[] {
		const results: IntermediateQueryResult[] = [];

		for (const query of this.queryList) {
			const fragment = this.buildFragment(query);

			results.push({
				...fragment,
			});
		}

		return results;
	}

	private buildFragment(fragment: IntermediateBuilderQuery): BuildFragment {
		let result: string[] = [];
		let props = fragment.props;
		let varNames: string[] = [];

		switch (fragment.type) {
			case BuilderQueryTypes.MATCH:
				result.push('MATCH');
				const matchChildren = this.buildChildren(fragment.children);
				result.push(matchChildren.query);
				if (matchChildren.props) {
					props = { ...props, ...matchChildren.props };
				}
				varNames.push(...matchChildren.variableNames)
				break;
			case BuilderQueryTypes.MERGE:
				result.push('MERGE ');
				let mergeChildren = this.buildChildren(fragment.children);
				result.push(mergeChildren.query);
				if (mergeChildren.props) {
					props = { ...props, ...mergeChildren.props };
				}
				varNames.push(...mergeChildren.variableNames);
				break;
			case BuilderQueryTypes.RELATION:
				result.push(`-[${fragment.varName ?? ''}:${fragment.label}`);
				if (fragment.props) {
					if (!fragment.varName) {
						fragment.varName = this.varGenerator();
					}
					result.push(this.buildPropsString(fragment.props ?? {}, fragment.varName));
				}
				result.push(']->');
				if (fragment.varName) {
					varNames.push(fragment.varName);
				}
				break;
			case BuilderQueryTypes.NODE:
				result.push(`(${fragment.varName ?? ''}:${fragment.label}`);
				if (fragment.props) {
					if (!fragment.varName) {
						fragment.varName = this.varGenerator();
					}
					result.push(this.buildPropsString(fragment.props ?? {}, fragment.varName));
				}
				result.push(')');
				if (fragment.varName) {
					varNames.push(fragment.varName);
				}
				break;
			case BuilderQueryTypes.RETURN:
				result.push(
					`RETURN ${(fragment.props!['varNames'] as string[]).join(', ')}`
				);
				break;
			default:
				throw new Error(`Unsupported type of fragment "${fragment.type}"`);
		}

		return { query: result.join(''), props, variableNames: varNames };
	}

	private buildChildren(children: IntermediateBuilderQuery[]): BuildFragment {
		const result: string[] = [];
		let props: IndexedObject = {};
		let varNames: string[] = [];

		for (const child of children) {
			const childBuild = this.buildFragment(child);
			result.push(childBuild.query);
			if (childBuild.props && child.varName) {
				varNames.push(...childBuild.variableNames);
				props = { ...props, ...this.generateProps(childBuild.props, child.varName)}
			}
		}

		return { query: result.join(''), props, variableNames: varNames };
	}

	private generateProps(props: IndexedObject, varName: string): IndexedObject {
		const result: IndexedObject = {}

		for (const [key, value] of Object.entries(props)) {
			result[`${key}__${varName}`] = value;
		}

		return result;
	}

	private buildPropsString(props: IndexedObject, varName: string): string {
		const result: string[] = [];
		const tempResult: string[] = [];
		if (props && Object.keys(props).length > 0) {
			result.push(' { ');
			for (const key of Object.keys(props)) {
				tempResult.push(`${key}: $${key}__${varName}`);
			}
			result.push(tempResult.join(', '), ' }');
		}
		return result.join('');
	}
}

type RefType = 'varname' | 'object';

class Ref<T extends RefType> {
	public readonly refType: T;
	public value: string | IntermediateBuilderQuery | null;

	public readonly __isRef = true;

	constructor(type: T) {
		this.refType = type;
		this.value = null;
	}
}

function createRef<T extends RefType>(type: T): Ref<T> {
	return new Ref<T>(type);
}

export default BaseBuilder;
export { Ref, createRef };
export type {
	RefType,
	BuilderOptions,
	Props,
	IntermediateBuilderQuery,
	BuilderWithOut,
	StatementStartBuilder,
	StatementPathBuilder,
	OptionalBuilder,
};
