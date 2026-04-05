import { ObjectCheck } from '../checks/object.check';
import { ArrayCheck } from '../checks/array.check';
import { ArrayItemCheck } from '../checks/array.item.check';
import { FieldCheck } from '../checks/field.check';
import type { ArrayContainsOptions, Check, CheckOptions, ResultOptions, TolerantCheckOptions } from '../types';

type ClassConstructor<T = unknown> = abstract new (...args: any[]) => T;
type CheckerPrototype = { prototype: object };
type PublicDecoratorFactory = (...args: unknown[]) => PropertyDecorator;
type DecoratorTarget = 'property' | 'item';
type DecoratorGroup<TMethods extends string> = Record<TMethods, PublicDecoratorFactory>;

export interface ClassValidationOptions {
	noExtraFields?: boolean;
	noExtraFieldsOptions?: CheckOptions;
	result?: ResultOptions;
	skip?: 'decorators' | 'inference';
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
	mode?: 'each' | 'contains';
	containsOptions?: ArrayContainsOptions;
	nested?: {
		type: ClassConstructor;
		options?: ClassValidationOptions;
	};
	rules: MethodRule[];
}

interface PropertyMetadata {
	required?: CheckOptions;
	optional: boolean;
	entrypoint?: EntryPointConfig;
	nested?: {
		type: ClassConstructor;
		options?: ClassValidationOptions;
	};
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

export function matchesType(
	type: abstract new (...args: any[]) => unknown,
	options?: ClassValidationOptions,
): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensurePropertyMetadata(target, propertyKey);
		metadata.nested = { type, options };
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
	matchesType(type: abstract new (...args: any[]) => unknown, options?: ClassValidationOptions): PropertyDecorator {
		return function (target: object, propertyKey: string | symbol): void {
			const metadata = ensureItemMetadata(target, propertyKey);
			metadata.nested = { type, options };
		};
	},
};

export function containsItems(options?: ArrayContainsOptions): PropertyDecorator {
	return function (target: object, propertyKey: string | symbol): void {
		const metadata = ensureItemMetadata(target, propertyKey);
		metadata.mode = 'contains';
		metadata.containsOptions = options ? { ...options } : undefined;
	};
}

export const stringField = type.string;
export const numberField = type.number;
export const booleanField = type.boolean;
export const dateField = type.date;

export async function validateClass<T>(
	input: unknown,
	type: abstract new (...args: any[]) => T,
	options: ClassValidationOptions = {},
): Promise<ObjectCheck> {
	const check = ObjectCheck.for(input);
	return applyClassValidation(check, type, options);
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

async function applyClassValidation<T>(
	check: ObjectCheck,
	type: ClassConstructor<T>,
	options: ClassValidationOptions,
): Promise<ObjectCheck> {
	const metadata = getClassValidationMetadata(type, options);

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
	options: ClassValidationOptions,
): Promise<Check> {
	const baseField: any = metadata.required !== undefined
		? checker.required(property, metadata.required)
		: checker.optional(property);

	let current: any = baseField;
	let currentEntryPoint: ActiveEntryPoint = 'field';

	if (metadata.nested) {
		current = baseField.object() as ObjectCheck;
		currentEntryPoint = 'object';
		await applyClassValidation(current, metadata.nested.type, mergeClassValidationOptions(options, metadata.nested.options));
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
	options: ClassValidationOptions,
): Promise<ArrayCheck> {
	if (metadata.mode === 'contains') {
		await arrayCheck.contains(itemChecker => [applyItemRules(itemChecker, metadata, options)], metadata.containsOptions);
		return arrayCheck;
	}

	await arrayCheck.checkEach(itemChecker => [applyItemRules(itemChecker, metadata, options)]);
	return arrayCheck;
}

async function applyItemRules(
	itemChecker: ArrayItemCheck,
	metadata: ItemMetadata,
	options: ClassValidationOptions,
): Promise<Check> {
	const baseItem: any = itemChecker;

	let current: any = baseItem;
	let currentEntryPoint: ActiveEntryPoint = 'field';

	if (metadata.nested) {
		current = baseItem.object() as ObjectCheck;
		currentEntryPoint = 'object';
		await applyClassValidation(current, metadata.nested.type, mergeClassValidationOptions(options, metadata.nested.options));
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

function getClassValidationMetadata(
	type: ClassConstructor,
	options: ClassValidationOptions,
): Map<string, PropertyMetadata> {
	const metadata = options.skip === 'decorators'
		? new Map<string, PropertyMetadata>()
		: cloneClassMetadata(classMetadata.get(type));

	if (options.skip !== 'inference') {
		mergeInferredMetadata(metadata, inferClassMetadata(type));
	}

	return metadata;
}

function cloneClassMetadata(metadata?: ReadonlyMap<string, PropertyMetadata>): Map<string, PropertyMetadata> {
	const cloned = new Map<string, PropertyMetadata>();

	if (!metadata) {
		return cloned;
	}

	for (const [property, propertyMetadata] of metadata) {
		cloned.set(property, clonePropertyMetadata(propertyMetadata));
	}

	return cloned;
}

function clonePropertyMetadata(metadata: PropertyMetadata): PropertyMetadata {
	return {
		required: metadata.required,
		optional: metadata.optional,
		entrypoint: metadata.entrypoint ? { ...metadata.entrypoint } : undefined,
		nested: metadata.nested ? cloneNestedMetadata(metadata.nested) : undefined,
		rules: [...metadata.rules],
		item: metadata.item ? cloneItemMetadata(metadata.item) : undefined,
	};
}

function cloneItemMetadata(metadata: ItemMetadata): ItemMetadata {
	return {
		entrypoint: metadata.entrypoint ? { ...metadata.entrypoint } : undefined,
		mode: metadata.mode,
		containsOptions: metadata.containsOptions ? { ...metadata.containsOptions } : undefined,
		nested: metadata.nested ? cloneNestedMetadata(metadata.nested) : undefined,
		rules: [...metadata.rules],
	};
}

function cloneNestedMetadata(metadata: { type: ClassConstructor; options?: ClassValidationOptions }): {
	type: ClassConstructor;
	options?: ClassValidationOptions;
} {
	return {
		type: metadata.type,
		options: metadata.options ? { ...metadata.options } : undefined,
	};
}

function mergeInferredMetadata(
	target: Map<string, PropertyMetadata>,
	inferred: Map<string, PropertyMetadata>,
): void {
	for (const [property, inferredMetadata] of inferred) {
		const existing = target.get(property);

		if (!existing) {
			target.set(property, inferredMetadata);
			continue;
		}

		mergePropertyMetadata(existing, inferredMetadata);
	}
}

function mergePropertyMetadata(target: PropertyMetadata, inferred: PropertyMetadata): void {
	if (!hasExplicitPropertyShape(target)) {
		target.entrypoint ??= inferred.entrypoint ? { ...inferred.entrypoint } : undefined;
		target.nested ??= inferred.nested ? cloneNestedMetadata(inferred.nested) : undefined;
	}

	if (!hasExplicitItemShape(target.item)) {
		target.item = inferred.item ? cloneItemMetadata(inferred.item) : target.item;
	}
}

function hasExplicitPropertyShape(metadata: PropertyMetadata): boolean {
	return metadata.nested !== undefined
		|| metadata.entrypoint !== undefined
		|| metadata.rules.length > 0;
}

function hasExplicitItemShape(metadata?: ItemMetadata): boolean {
	if (!metadata) {
		return false;
	}

	return metadata.nested !== undefined
		|| metadata.entrypoint !== undefined
		|| metadata.mode !== undefined
		|| metadata.containsOptions !== undefined
		|| metadata.rules.length > 0;
}

function inferClassMetadata(type: ClassConstructor): Map<string, PropertyMetadata> {
	const instance = instantiateClass(type);
	const metadata = new Map<string, PropertyMetadata>();

	if (!instance || typeof instance !== 'object') {
		return metadata;
	}

	for (const [property, value] of Object.entries(instance as Record<string, unknown>)) {
		const propertyMetadata = inferPropertyMetadata(value);
		if (propertyMetadata) {
			metadata.set(property, propertyMetadata);
		}
	}

	return metadata;
}

function instantiateClass<T>(type: ClassConstructor<T>): T | undefined {
	try {
		const Constructor = type as unknown as new () => T;
		return new Constructor();
	} catch {
		return undefined;
	}
}

function inferPropertyMetadata(value: unknown): PropertyMetadata | undefined {
	const metadata = createDefaultPropertyMetadata();

	if (typeof value === 'string') {
		metadata.entrypoint = { kind: 'string' };
		return metadata;
	}

	if (typeof value === 'number') {
		metadata.entrypoint = { kind: 'number' };
		return metadata;
	}

	if (typeof value === 'boolean') {
		metadata.entrypoint = { kind: 'boolean' };
		return metadata;
	}

	if (value instanceof Date) {
		metadata.entrypoint = { kind: 'date' };
		return metadata;
	}

	if (Array.isArray(value)) {
		metadata.entrypoint = { kind: 'array' };
		metadata.item = inferArrayItemMetadata(value);
		return metadata;
	}

	if (isNestedClassInstance(value)) {
		metadata.nested = { type: value.constructor as ClassConstructor };
		return metadata;
	}

	if (isPlainObject(value)) {
		metadata.entrypoint = { kind: 'object' };
		return metadata;
	}

	return undefined;
}

function createDefaultPropertyMetadata(): PropertyMetadata {
	return {
		optional: true,
		rules: [],
	};
}

function inferArrayItemMetadata(values: unknown[]): ItemMetadata | undefined {
	const sample = values.find(value => value !== undefined && value !== null);
	if (sample === undefined) {
		return undefined;
	}

	const propertyMetadata = inferPropertyMetadata(sample);
	if (!propertyMetadata) {
		return undefined;
	}

	return {
		entrypoint: propertyMetadata.entrypoint ? { ...propertyMetadata.entrypoint } : undefined,
		nested: propertyMetadata.nested ? cloneNestedMetadata(propertyMetadata.nested) : undefined,
		rules: [],
	};
}

function mergeClassValidationOptions(
	parent: ClassValidationOptions,
	overrides?: ClassValidationOptions,
): ClassValidationOptions {
	if (!overrides) {
		return parent;
	}

	return {
		...parent,
		...overrides,
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') {
		return false;
	}

	return Object.getPrototypeOf(value) === Object.prototype;
}

function isNestedClassInstance(value: unknown): value is Record<string, unknown> & { constructor: Function } {
	if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype !== null && prototype !== Object.prototype;
}