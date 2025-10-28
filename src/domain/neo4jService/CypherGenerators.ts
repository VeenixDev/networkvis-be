import {
	BuilderQueryTypes,
	BuildFragment,
	IntermediateBuilderQuery,
} from './BuilderTypes';
import { VarGenerator } from './Neo4J';
import { Ref, RefType } from './Ref';
import {
	buildPropsString,
	computeVariableNames,
	generateProps,
} from './CypherHelper';
import { IndexedObject } from '../../shared/common/helpers/typeHelpers';

function buildFragment(fragment: IntermediateBuilderQuery, varGenerator: VarGenerator): BuildFragment {
	let result: string[] = [];
	let props = fragment.props;
	let varNames: string[] = [];

	switch (fragment.type) {
		case BuilderQueryTypes.MATCH:
			result.push('MATCH ');
			const matchChildren = buildChildren(fragment.children, varGenerator);
			result.push(matchChildren.query);
			if (matchChildren.props) {
				props = { ...props, ...matchChildren.props };
			}
			varNames.push(...matchChildren.variableNames)
			break;
		case BuilderQueryTypes.MERGE:
			result.push('MERGE ');
			let mergeChildren = buildChildren(fragment.children, varGenerator);
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
					fragment.varName = varGenerator();
				}
				result.push(buildPropsString(fragment.props ?? {}, fragment.varName));
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
					fragment.varName = varGenerator();
				}
				result.push(buildPropsString(fragment.props ?? {}, fragment.varName));
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
			let onCreateChildren = buildChildren(fragment.children, varGenerator);
			result.push(onCreateChildren.query);
			if (onCreateChildren.props) {
				props = { ...props, ...onCreateChildren.props };
			}
			varNames.push(...onCreateChildren.variableNames);
			break;
		case BuilderQueryTypes.ON_MATCH:
			result.push('ON MATCH ');
			let onMatchChildren = buildChildren(fragment.children, varGenerator);
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
			const varRef = computeVariableNames([fragment.internalProps['ref'] as Ref<RefType>])[0];

			if (!varRef) {
				throw new Error('Could not resolve variable reference');
			}

			result.push(`SET`);

			const tempSetArr: string[] = []
			const setInternalProps = fragment.internalProps['props'] as IndexedObject;
			for (const [key, _] of Object.entries(setInternalProps)) {
				tempSetArr.push(`${varRef}.${key} = $${key}__${varRef}`);
			}

			props = generateProps(setInternalProps, varRef);

			result.push(' ', tempSetArr.join(', '));
			break;
		default:
			throw new Error(`Unsupported type of fragment "${fragment.type}"`);
	}

	return { query: result.join(''), props, variableNames: varNames };
}

function buildChildren(children: IntermediateBuilderQuery[], varGenerator: VarGenerator): BuildFragment {
	const result: string[] = [];
	let props: IndexedObject = {};
	let varNames: string[] = [];

	for (const child of children) {
		const childBuild = buildFragment(child, varGenerator);
		result.push(childBuild.query);
		if (childBuild.props && child.varName) {
			varNames.push(...childBuild.variableNames);
			props = { ...props, ...generateProps(childBuild.props, child.varName)}
		} else if (childBuild.props) {
			props = { ...props, ...childBuild.props };
		}
	}

	return { query: result.join(''), props, variableNames: varNames };
}

export {
	buildFragment,
	buildChildren,
}