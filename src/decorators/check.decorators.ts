import { StringCheck } from '../checks/string.check';
import { NumberCheck } from '../checks/number.check';
import { DateCheck } from '../checks/date.check';
import { EmailCheck } from '../checks/email.check';
import { UrlCheck } from '../checks/url.check';
import { FileCheck } from '../checks/file.check';
import { ImageCheck } from '../checks/image.check';
import { ArrayCheck } from '../checks/array.check';
import { ObjectCheck } from '../checks/object.check';
import { FieldCheck } from '../checks/field.check';
import type { ArrayContainsOptions } from '../types';
import { containsItems, createDecoratorGroup, items, matchesType } from './decorator.factory';

const objectMethods = [
	'notEmpty',
	'noExtraFields',
] as const;

const stringMethods = [
	'trim',
	'minLength',
	'maxLength',
	'pattern',
	'equals',
	'equalsOneOf',
	'startsWith',
	'endsWith',
	'contains',
	'isBase64',
	'isSHA256',
	'isMD5',
	'isUUID',
	'isHexadecimal',
	'isAlphanumeric',
	'isAscii',
	'hasMultibyte',
	'hasUpperCase',
	'hasLowerCase',
	'hasDigit',
	'hasSpecialCharacter',
	'noSpecialCharacters',
	'noSpaces',
	'maxWords',
] as const;

const numberMethods = [
	'equals',
	'integer',
	'minPrecision',
	'positive',
	'negative',
	'nonNegative',
	'greaterThan',
	'lessThan',
	'atLeast',
	'atMost',
] as const;

const dateMethods = [
	'equals',
	'after',
	'before',
	'sameDay',
	'sameMonth',
	'sameYear',
	'withinMinutes',
	'withinHours',
	'withinDays',
	'withinMonths',
] as const;

const emailMethods = [
	'host',
	'tld',
] as const;

const urlMethods = [
	'host',
	'tld',
	'protocol',
	'port',
] as const;

const fileMethods = [
	'mimeType',
	'notEmpty',
	'minSize',
	'maxSize',
] as const;

const imageMethods = [
	'mimeType',
	'notEmpty',
	'minSize',
	'maxSize',
	'isImage',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
] as const;

const booleanMethods = [
	'equals',
] as const;

const arrayMethods = [
	'notEmpty',
	'minLength',
	'maxLength',
	'noDuplicates',
	'matchesType',
] as const;

const objectRules = createDecoratorGroup('property', 'object', ObjectCheck, objectMethods);
const itemObjectRules = createDecoratorGroup('item', 'object', ObjectCheck, objectMethods);
const arrayRules = createDecoratorGroup('property', 'array', ArrayCheck, arrayMethods);

export const object: {
	notEmpty: (...args: unknown[]) => PropertyDecorator;
	noExtraFields: (...args: unknown[]) => PropertyDecorator;
	matchesType: typeof matchesType;
} = {
	...objectRules,
	matchesType,
};

export const string: {
	trim: (...args: unknown[]) => PropertyDecorator;
	minLength: (...args: unknown[]) => PropertyDecorator;
	maxLength: (...args: unknown[]) => PropertyDecorator;
	pattern: (...args: unknown[]) => PropertyDecorator;
	equals: (...args: unknown[]) => PropertyDecorator;
	equalsOneOf: (...args: unknown[]) => PropertyDecorator;
	startsWith: (...args: unknown[]) => PropertyDecorator;
	endsWith: (...args: unknown[]) => PropertyDecorator;
	contains: (...args: unknown[]) => PropertyDecorator;
	isBase64: (...args: unknown[]) => PropertyDecorator;
	isSHA256: (...args: unknown[]) => PropertyDecorator;
	isMD5: (...args: unknown[]) => PropertyDecorator;
	isUUID: (...args: unknown[]) => PropertyDecorator;
	isHexadecimal: (...args: unknown[]) => PropertyDecorator;
	isAlphanumeric: (...args: unknown[]) => PropertyDecorator;
	isAscii: (...args: unknown[]) => PropertyDecorator;
	hasMultibyte: (...args: unknown[]) => PropertyDecorator;
	hasUpperCase: (...args: unknown[]) => PropertyDecorator;
	hasLowerCase: (...args: unknown[]) => PropertyDecorator;
	hasDigit: (...args: unknown[]) => PropertyDecorator;
	hasSpecialCharacter: (...args: unknown[]) => PropertyDecorator;
	noSpecialCharacters: (...args: unknown[]) => PropertyDecorator;
	noSpaces: (...args: unknown[]) => PropertyDecorator;
	maxWords: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'string', StringCheck, stringMethods);

export const stringRules = string;

export const number: {
	equals: (...args: unknown[]) => PropertyDecorator;
	integer: (...args: unknown[]) => PropertyDecorator;
	minPrecision: (...args: unknown[]) => PropertyDecorator;
	positive: (...args: unknown[]) => PropertyDecorator;
	negative: (...args: unknown[]) => PropertyDecorator;
	nonNegative: (...args: unknown[]) => PropertyDecorator;
	greaterThan: (...args: unknown[]) => PropertyDecorator;
	lessThan: (...args: unknown[]) => PropertyDecorator;
	atLeast: (...args: unknown[]) => PropertyDecorator;
	atMost: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'number', NumberCheck, numberMethods);

export const numberRules = number;

export const date: {
	equals: (...args: unknown[]) => PropertyDecorator;
	after: (...args: unknown[]) => PropertyDecorator;
	before: (...args: unknown[]) => PropertyDecorator;
	sameDay: (...args: unknown[]) => PropertyDecorator;
	sameMonth: (...args: unknown[]) => PropertyDecorator;
	sameYear: (...args: unknown[]) => PropertyDecorator;
	withinMinutes: (...args: unknown[]) => PropertyDecorator;
	withinHours: (...args: unknown[]) => PropertyDecorator;
	withinDays: (...args: unknown[]) => PropertyDecorator;
	withinMonths: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'date', DateCheck, dateMethods);

export const dateRules = date;

export const boolean: {
	equals: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'boolean', FieldCheck, booleanMethods);

export const booleanRules = boolean;

export const email: {
	host: (...args: unknown[]) => PropertyDecorator;
	tld: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'email', EmailCheck, emailMethods);

export const url: {
	host: (...args: unknown[]) => PropertyDecorator;
	tld: (...args: unknown[]) => PropertyDecorator;
	protocol: (...args: unknown[]) => PropertyDecorator;
	port: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'url', UrlCheck, urlMethods);

export const file: {
	mimeType: (...args: unknown[]) => PropertyDecorator;
	notEmpty: (...args: unknown[]) => PropertyDecorator;
	minSize: (...args: unknown[]) => PropertyDecorator;
	maxSize: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'file', FileCheck, fileMethods);

export const image: {
	mimeType: (...args: unknown[]) => PropertyDecorator;
	notEmpty: (...args: unknown[]) => PropertyDecorator;
	minSize: (...args: unknown[]) => PropertyDecorator;
	maxSize: (...args: unknown[]) => PropertyDecorator;
	isImage: (...args: unknown[]) => PropertyDecorator;
	minWidth: (...args: unknown[]) => PropertyDecorator;
	minHeight: (...args: unknown[]) => PropertyDecorator;
	maxWidth: (...args: unknown[]) => PropertyDecorator;
	maxHeight: (...args: unknown[]) => PropertyDecorator;
} = createDecoratorGroup('property', 'image', ImageCheck, imageMethods);

export const array: {
	notEmpty: (...args: unknown[]) => PropertyDecorator;
	minLength: (...args: unknown[]) => PropertyDecorator;
	maxLength: (...args: unknown[]) => PropertyDecorator;
	noDuplicates: (...args: unknown[]) => PropertyDecorator;
	matchesType: typeof matchesType;
	contains: (options?: ArrayContainsOptions) => PropertyDecorator;
} = {
	...arrayRules,
	contains: containsItems,
};

export const item: {
	object: {
		notEmpty: (...args: unknown[]) => PropertyDecorator;
		noExtraFields: (...args: unknown[]) => PropertyDecorator;
		matchesType: typeof items.matchesType;
	};
	string: typeof string;
	number: typeof number;
	boolean: typeof boolean;
	date: typeof date;
	email: typeof email;
	url: typeof url;
	file: typeof file;
	image: typeof image;
	array: {
		notEmpty: (...args: unknown[]) => PropertyDecorator;
		minLength: (...args: unknown[]) => PropertyDecorator;
		maxLength: (...args: unknown[]) => PropertyDecorator;
		noDuplicates: (...args: unknown[]) => PropertyDecorator;
		matchesType: typeof matchesType;
	};
} = {
	object: {
		...itemObjectRules,
		matchesType: items.matchesType,
	},
	string: createDecoratorGroup('item', 'string', StringCheck, stringMethods),
	number: createDecoratorGroup('item', 'number', NumberCheck, numberMethods),
	boolean: createDecoratorGroup('item', 'boolean', FieldCheck, booleanMethods),
	date: createDecoratorGroup('item', 'date', DateCheck, dateMethods),
	email: createDecoratorGroup('item', 'email', EmailCheck, emailMethods),
	url: createDecoratorGroup('item', 'url', UrlCheck, urlMethods),
	file: createDecoratorGroup('item', 'file', FileCheck, fileMethods),
	image: createDecoratorGroup('item', 'image', ImageCheck, imageMethods),
	array: createDecoratorGroup('item', 'array', ArrayCheck, arrayMethods),
};