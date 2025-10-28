import { IndexedObject } from '../../shared/common/helpers/typeHelpers';
import { IntermediateBuilderQuery } from './BuilderTypes';

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

export {
	Ref,
	createRef,
	createVarRef,
	createObjRef,
}
export type {
	RefType,
}