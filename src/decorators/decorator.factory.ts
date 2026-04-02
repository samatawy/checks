import { ObjectCheck } from '../checks/object.check';
import { ArrayCheck } from '../checks/array.check';
import { ArrayItemCheck } from '../checks/array.item.check';
import { FieldCheck } from '../checks/field.check';
import type { Check, CheckOptions, ResultOptions, TolerantCheckOptions } from '../types';

type ClassConstructor<T = unknown> = abstract new (...args: any[]) => T;
type CheckerPrototype = { prototype: object };
type PublicDecoratorFactory = (...args: unknown[]) => PropertyDecorator;
type DecoratorTarget = 'property' | 'item';
type DecoratorGroup<TMethods extends string> = Record<TMethods, PublicDecoratorFactory>;

export interface DecoratedValidationOptions {
	noExtraFields?: boolean;
	noExtraFieldsOptions?: CheckOptions;
	result?: ResultOptions;
}

type EntryPoint =
	| 'object'
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'email'
	| 'url'
	| 'file'
	| 'image'
	| 'array';

type ActiveEntryPoint = EntryPoint | 'field';

interface EntryPointConfig {
	kind: EntryPoint;
	options?: TolerantCheckOptions;
}

interface MethodRule {
	entrypoint: EntryPoint;
	method: string;
	args: unknown[];
}

interface ItemMetadata {
	entrypoint?: EntryPointConfig;
	nested?: ClassConstructor;
	rules: MethodRule[];
}

interface PropertyMetadata {
	required?: CheckOptions;
	optional: boolean;
	entrypoint?: EntryPointConfig;
	nested?: ClassConstructor;
	rules: MethodRule[];
	item?: ItemMetadata;
}

const classMetadata = new WeakMap<Function, Map<string, PropertyMetadata>>();

export function required(options?: CheckOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensurePropertyMetadata(target, propertyKey);
		metadata.required = options;
		metadata.optional = false;
	};
}

export function optional(): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensurePropertyMetadata(target, propertyKey);
		metadata.optional = true;
	};
}

export function matchesType(type: abstract new (...args: any[]) => unknown): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensurePropertyMetadata(target, propertyKey);
		metadata.nested = type;
	};
}

export const type = {
	object(): PropertyDecorator {
		return setPropertyEntryPoint('object');
	},
	string(): PropertyDecorator {
		return setPropertyEntryPoint('string');
	},
	number(options?: TolerantCheckOptions): PropertyDecorator {
		return setPropertyEntryPoint('number', options);
	},
	boolean(options?: TolerantCheckOptions): PropertyDecorator {
		return setPropertyEntryPoint('boolean', options);
	},
	date(): PropertyDecorator {
		return setPropertyEntryPoint('date');
	},
	email(): PropertyDecorator {
		return setPropertyEntryPoint('email');
	},
	url(): PropertyDecorator {
		return setPropertyEntryPoint('url');
	},
	file(): PropertyDecorator {
		return setPropertyEntryPoint('file');
	},
	image(): PropertyDecorator {
		return setPropertyEntryPoint('image');
	},
	array(): PropertyDecorator {
		return setPropertyEntryPoint('array');
	},
};

export const items = {
	object(): PropertyDecorator {
		return setItemEntryPoint('object');
	},
	string(): PropertyDecorator {
		return setItemEntryPoint('string');
	},
	number(options?: TolerantCheckOptions): PropertyDecorator {
		return setItemEntryPoint('number', options);
	},
	boolean(options?: TolerantCheckOptions): PropertyDecorator {
		return setItemEntryPoint('boolean', options);
	},
	date(): PropertyDecorator {
		return setItemEntryPoint('date');
	},
	email(): PropertyDecorator {
		return setItemEntryPoint('email');
	},
	url(): PropertyDecorator {
		return setItemEntryPoint('url');
	},
	file(): PropertyDecorator {
		return setItemEntryPoint('file');
	},
	image(): PropertyDecorator {
		return setItemEntryPoint('image');
	},
	array(): PropertyDecorator {
		return setItemEntryPoint('array');
	},
	matchesType(type: abstract new (...args: any[]) => unknown): PropertyDecorator {
		return function (target: object, propertyKey: string | symbol): void {
			const metadata = ensureItemMetadata(target, propertyKey);
			metadata.nested = type;
		};
	},
};

export const stringField = type.string;
export const numberField = type.number;
export const booleanField = type.boolean;
export const dateField = type.date;

export async function validateDecoratedClass<T>(
	input: unknown,
	type: abstract new (...args: any[]) => T,
	options: DecoratedValidationOptions = {},
): Promise<ObjectCheck> {
	const check = ObjectCheck.for(input);
	return applyDecoratedClass(check, type, options);
}

export function getDecoratedClassMetadata(type: ClassConstructor): ReadonlyMap<string, Readonly<PropertyMetadata>> {
	const metadata = classMetadata.get(type) ?? new Map<string, PropertyMetadata>();
	return metadata;
}

export function createDecoratorGroup<const TMethods extends readonly string[]>(
	target: DecoratorTarget,
	entrypoint: EntryPoint,
	checkerType: CheckerPrototype,
	methods: TMethods,
): DecoratorGroup<TMethods[number]> {
	assertMethodsExist(entrypoint, checkerType, methods);

	const entries = methods.map(method => {
		const decorator: PublicDecoratorFactory = (...args: unknown[]) => {
			return function (targetObject: object, propertyKey: string | symbol): void {
				if (target === 'property') {
					const metadata = ensurePropertyMetadata(targetObject, propertyKey);
					metadata.rules.push({ entrypoint, method, args });
					return;
				}

				const metadata = ensureItemMetadata(targetObject, propertyKey);
				metadata.rules.push({ entrypoint, method, args });
			};
		};

		return [method, decorator] as const;
	});

	return Object.fromEntries(entries) as DecoratorGroup<TMethods[number]>;
}

async function applyDecoratedClass<T>(
	check: ObjectCheck,
	type: ClassConstructor<T>,
	options: DecoratedValidationOptions,
): Promise<ObjectCheck> {
	const metadata = classMetadata.get(type) ?? new Map<string, PropertyMetadata>();

	if (options.noExtraFields) {
		check.noExtraFields(options.noExtraFieldsOptions);
	}

	await check.check(current => {
		const checks: Array<Check | Promise<Check>> = [];

		for (const [property, propertyMetadata] of metadata) {
			checks.push(applyPropertyRules(current, property, propertyMetadata, options));
		}

		return checks;
	});

	return check;
}

async function applyPropertyRules(
	checker: ObjectCheck,
	property: string,
	metadata: PropertyMetadata,
	options: DecoratedValidationOptions,
): Promise<Check> {
	const baseField: any = metadata.required !== undefined
		? checker.required(property, metadata.required)
		: checker.optional(property);

	let current: any = baseField;
	let currentEntryPoint: ActiveEntryPoint = 'field';

	if (metadata.nested) {
		current = baseField.object() as ObjectCheck;
		currentEntryPoint = 'object';
		await applyDecoratedClass(current, metadata.nested, options);
	} else if (metadata.entrypoint) {
		current = await resolveEntryPoint(baseField, 'property', metadata.entrypoint);
		currentEntryPoint = metadata.entrypoint.kind;
	}

	for (const rule of metadata.rules) {
		current = await ensureEntryPoint(baseField, current, currentEntryPoint, 'property', rule.entrypoint, metadata.entrypoint?.options);
		currentEntryPoint = rule.entrypoint;
		current = invokeCheckerMethod(current, rule.method, rule.args, rule.entrypoint, property);
	}

	if (metadata.item) {
		current = await ensureEntryPoint(baseField, current, currentEntryPoint, 'property', 'array', metadata.entrypoint?.options);
		await applyArrayItemRules(current as ArrayCheck, metadata.item, options);
	}

	return current;
}

async function applyArrayItemRules(
	arrayCheck: ArrayCheck,
	metadata: ItemMetadata,
	options: DecoratedValidationOptions,
): Promise<ArrayCheck> {
	await arrayCheck.checkEach(itemChecker => [applyItemRules(itemChecker, metadata, options)]);
	return arrayCheck;
}

async function applyItemRules(
	itemChecker: ArrayItemCheck,
	metadata: ItemMetadata,
	options: DecoratedValidationOptions,
): Promise<Check> {
	const baseItem: any = itemChecker;

	let current: any = baseItem;
	let currentEntryPoint: ActiveEntryPoint = 'field';

	if (metadata.nested) {
		current = baseItem.object() as ObjectCheck;
		currentEntryPoint = 'object';
		await applyDecoratedClass(current, metadata.nested, options);
	} else if (metadata.entrypoint) {
		current = await resolveEntryPoint(baseItem, 'item', metadata.entrypoint);
		currentEntryPoint = metadata.entrypoint.kind;
	}

	for (const rule of metadata.rules) {
		current = await ensureEntryPoint(baseItem, current, currentEntryPoint, 'item', rule.entrypoint, metadata.entrypoint?.options);
		currentEntryPoint = rule.entrypoint;
		current = invokeCheckerMethod(current, rule.method, rule.args, rule.entrypoint, `array item ${String((baseItem as { key?: string | number }).key ?? '?')}`);
	}

	return current;
}

async function resolveEntryPoint(base: any, target: DecoratorTarget, entrypoint: EntryPointConfig): Promise<any> {
	return target === 'property'
		? resolvePropertyEntryPoint(base, entrypoint)
		: resolveItemEntryPoint(base, entrypoint);
}

async function ensureEntryPoint(
	base: any,
	current: any,
	currentEntryPoint: ActiveEntryPoint,
	target: DecoratorTarget,
	nextEntryPoint: EntryPoint,
	options?: TolerantCheckOptions,
): Promise<any> {
	if (currentEntryPoint === nextEntryPoint) {
		return current;
	}

	return resolveEntryPoint(base, target, { kind: nextEntryPoint, options });
}

async function resolvePropertyEntryPoint(base: any, entrypoint: EntryPointConfig): Promise<any> {
	switch (entrypoint.kind) {
		case 'object':
			return base.object();
		case 'string':
			return base.string();
		case 'number':
			return base.number(entrypoint.options);
		case 'boolean':
			return base.boolean(entrypoint.options);
		case 'date':
			return base.date();
		case 'email':
			return base.email();
		case 'url':
			return base.url();
		case 'file':
			return await base.file();
		case 'image':
			return await base.image();
		case 'array':
			return base.array();
	}
}

async function resolveItemEntryPoint(base: any, entrypoint: EntryPointConfig): Promise<any> {
	switch (entrypoint.kind) {
		case 'object':
			return base.object();
		case 'string':
			return base.string();
		case 'number':
			return base.number(entrypoint.options);
		case 'boolean':
			return base.boolean(entrypoint.options);
		case 'date':
			return base.date();
		case 'email':
			if (typeof base.email === 'function') {
				return base.email();
			}
			return base.string().email();
		case 'url':
			if (typeof base.url === 'function') {
				return base.url();
			}
			return base.string().url();
		case 'file':
			return await new FieldCheck((base as { key: string | number }).key, (base as { data: unknown }).data).file();
		case 'image':
			return await new FieldCheck((base as { key: string | number }).key, (base as { data: unknown }).data).image();
		case 'array':
			return base.array();
	}
}

function invokeCheckerMethod(current: any, method: string, args: unknown[], entrypoint: EntryPoint, property: string): any {
	const candidate = current[method];

	if (typeof candidate !== 'function') {
		throw new Error(`Method ${method} is not available on ${entrypoint} checker for property ${property}.`);
	}

	return candidate.apply(current, args);
}

function setPropertyEntryPoint(kind: EntryPoint, options?: TolerantCheckOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensurePropertyMetadata(target, propertyKey);
		metadata.entrypoint = { kind, options };
	};
}

function setItemEntryPoint(kind: EntryPoint, options?: TolerantCheckOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensureItemMetadata(target, propertyKey);
		metadata.entrypoint = { kind, options };
	};
}

function assertMethodsExist(entrypoint: EntryPoint, checkerType: CheckerPrototype, methods: readonly string[]): void {
	const available = listPrototypeMethods(checkerType.prototype);

	for (const method of methods) {
		if (!available.has(method)) {
			throw new Error(`Method ${method} is not available on ${entrypoint} checker.`);
		}
	}
}

function listPrototypeMethods(prototype: object): Set<string> {
	const methods = new Set<string>();
	let current: object | null = prototype;

	while (current && current !== Object.prototype) {
		for (const name of Object.getOwnPropertyNames(current)) {
			if (name === 'constructor') {
				continue;
			}

			const descriptor = Object.getOwnPropertyDescriptor(current, name);
			if (typeof descriptor?.value === 'function') {
				methods.add(name);
			}
		}

		current = Object.getPrototypeOf(current);
	}

	return methods;
}

function ensurePropertyMetadata(target: object, propertyKey: string | symbol): PropertyMetadata {
	if (typeof propertyKey !== 'string') {
		throw new Error('Decorated validation only supports string property names.');
	}

	const ctor = target.constructor;
	let metadata = classMetadata.get(ctor);

	if (!metadata) {
		metadata = new Map<string, PropertyMetadata>();
		classMetadata.set(ctor, metadata);
	}

	let propertyMetadata = metadata.get(propertyKey);

	if (!propertyMetadata) {
		propertyMetadata = {
			optional: true,
			rules: [],
		};
		metadata.set(propertyKey, propertyMetadata);
	}

	return propertyMetadata;
}

function ensureItemMetadata(target: object, propertyKey: string | symbol): ItemMetadata {
	const propertyMetadata = ensurePropertyMetadata(target, propertyKey);

	if (!propertyMetadata.item) {
		propertyMetadata.item = {
			rules: [],
		};
	}

	return propertyMetadata.item;
}