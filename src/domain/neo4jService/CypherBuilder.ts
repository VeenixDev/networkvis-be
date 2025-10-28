import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import Neo4J, { IntermediateQueryResult, VarGenerator } from './Neo4J';

enum BuilderQueryTypes {
	MATCH = 'MATCH',
	MERGE = 'MERGE',
	RELATION = 'RELATION',
	NODE = 'NODE',
	OPTIONAL = 'OPTIONAL',
	SET = 'SET',
	ON_CREATE = 'ON_CREATE',
	ON_MATCH = 'ON_MATCH',
	RETURN = 'RETURN',
}

type IntermediateBuilderQuery = {
	type: BuilderQueryTypes;
	varName?: string;
	label?: string;
	props?: IndexedObject;
	internalProps?: IndexedObject;
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
type MergeBuilder = Omit<BaseBuilder, 'Merge' | 'Match' | 'Optional'>;
type SetBuilder = Pick<BaseBuilder, 'Set'>;
type StatementStartBuilder = Omit<BaseBuilder, 'Node' | 'Relation'>;
type OptionalBuilder = Pick<BaseBuilder, 'Match'>;
type BuilderWithOut<T extends keyof BaseBuilder, D = BaseBuilder> = Omit<D, T>;
type TerminalBuilder = Pick<BaseBuilder, 'build'>;

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
		const computedVarNames = this.computeVariableNames(varNames);

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
				result.push('MATCH ');
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
				if (!fragment.internalProps) {
					throw new Error('Return cannot have no internal Props');
				}
				result.push(
					`RETURN ${(fragment.internalProps['varNames'] as string[]).join(', ')}`
				);
				break;
			case BuilderQueryTypes.ON_CREATE:
				result.push('ON CREATE ');
				let onCreateChildren = this.buildChildren(fragment.children);
				result.push(onCreateChildren.query);
				if (onCreateChildren.props) {
					props = { ...props, ...onCreateChildren.props };
				}
				varNames.push(...onCreateChildren.variableNames);
				break;
			case BuilderQueryTypes.ON_MATCH:
				result.push('ON MATCH ');
				let onMatchChildren = this.buildChildren(fragment.children);
				result.push(onMatchChildren.query);
				if (onMatchChildren.props) {
					props = { ...props, ...onMatchChildren.props };
				}
				varNames.push(...onMatchChildren.variableNames);
				break;
			case BuilderQueryTypes.OPTIONAL:
				result.push('OPTIONAL');
				break;
			case BuilderQueryTypes.SET:
				if (!fragment.internalProps) {
					throw new Error('Set cannot have no internal props');
				}
				if (!fragment.internalProps['ref']) {
					throw new Error('Set cannot have no varRef');
				}
				const varRef = this.computeVariableNames([fragment.internalProps['ref'] as Ref<RefType>])[0];

				if (!varRef) {
					throw new Error('Could not resolve variable reference');
				}

				result.push(`SET`);

				const tempSetArr: string[] = []
				const setInternalProps = fragment.internalProps['props'] as IndexedObject;
				for (const [key, _] of Object.entries(setInternalProps)) {
					tempSetArr.push(`${varRef}.${key} = $${key}__${varRef}`);
				}

				props = this.generateProps(setInternalProps, varRef);

				result.push(' ', tempSetArr.join(', '));
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
			} else if (childBuild.props) {
				props = { ...props, ...childBuild.props };
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

	private computeVariableNames(varNames: (string | Ref<RefType>)[]): string[] {
		return varNames.map((v): string => {
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
	}
}

type RefType = 'varname' | 'object';

class Ref<T extends RefType, _P extends IndexedObject = IndexedObject> {
	public readonly refType: T;
	public value: string | IntermediateBuilderQuery | null;

	public readonly __isRef = true;

	constructor(type: T) {
		this.refType = type;
		this.value = null;
	}
}

function createRef<T extends RefType, P extends IndexedObject = IndexedObject>(type: T): Ref<T, P> {
	return new Ref<T, P>(type);
}

function createVarRef<P extends IndexedObject = IndexedObject>(): Ref<'varname', P> {
	return new Ref<'varname', P>('varname');
}

function createObjRef<P extends IndexedObject = IndexedObject>(): Ref<'object', P> {
	return new Ref<'object', P>('object');
}

export default BaseBuilder;
export { Ref, createRef, createVarRef, createObjRef };
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
