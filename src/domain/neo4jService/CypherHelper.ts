import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import { Ref, RefType } from './Ref';
import { IntermediateBuilderQuery } from './BuilderTypes';

function generateProps(props: IndexedObject, varName: string): IndexedObject {
	const result: IndexedObject = {}

	for (const [key, value] of Object.entries(props)) {
		result[`${key}__${varName}`] = value;
	}

	return result;
}

function buildPropsString(props: IndexedObject, varName: string): string {
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

function computeVariableNames(varNames: (string | Ref<RefType>)[]): string[] {
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

function addNoQueryError (type: string): Error {
	return new Error(`Cannot add "${type}", no query exits.`);
}


export {
	generateProps,
	buildPropsString,
	computeVariableNames,
	addNoQueryError,
}