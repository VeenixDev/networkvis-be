import { Ref } from './Ref';
import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import BaseBuilder from './CypherBuilder';

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
type StatementStartBuilder = Omit<BaseBuilder, 'Node' | 'Relation' | 'OnMatch' | 'OnCreate'>;
type OptionalBuilder = Pick<BaseBuilder, 'Match'>;
type BuilderWithOut<T extends keyof BaseBuilder, D = BaseBuilder> = Omit<D, T>;
type TerminalBuilder = Pick<BaseBuilder, 'build'>;

type Props<T extends IndexedObject> = T;

export type {
	IntermediateBuilderQuery,
	BuilderOptions,
	BuildFragment,
	StatementPathBuilder,
	MergeBuilder,
	SetBuilder,
	StatementStartBuilder,
	OptionalBuilder,
	BuilderWithOut,
	TerminalBuilder,
	Props
}

export {
	BuilderQueryTypes
}