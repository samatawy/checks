import { StringCheck } from '../checks/string.check';
import { NumberCheck } from '../checks/number.check';
import { DateCheck } from '../checks/date.check';
import { EmailCheck } from '../checks/email.check';
import { UrlCheck } from '../checks/url.check';
import { FileCheck } from '../checks/file.check';
import { ImageCheck } from '../checks/image.check';
import { ArrayCheck } from '../checks/array.check';
import { ObjectCheck } from '../checks/object.check';
import { createDecoratorGroup, items, matchesType } from './decorator.factory';

const objectMethods = [
	'notEmpty',
	'noExtraFields',
] as const;

const objectRules = createDecoratorGroup('property', 'object', ObjectCheck, objectMethods);
const itemObjectRules = createDecoratorGroup('item', 'object', ObjectCheck, objectMethods);

export const object = {
	...objectRules,
	matchesType,
};

export const string = createDecoratorGroup('property', 'string', StringCheck, [
	'minLength',
	'maxLength',
	'pattern',
	'oneOf',
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
] as const);

export const stringRules = string;

export const number = createDecoratorGroup('property', 'number', NumberCheck, [
	'integer',
	'minPrecision',
	'positive',
	'negative',
	'nonNegative',
	'greaterThan',
	'lessThan',
	'atLeast',
	'atMost',
] as const);

export const numberRules = number;

export const date = createDecoratorGroup('property', 'date', DateCheck, [
	'after',
	'before',
	'sameDay',
	'sameMonth',
	'sameYear',
	'withinMinutes',
	'withinHours',
	'withinDays',
	'withinMonths',
] as const);

export const dateRules = date;

export const email = createDecoratorGroup('property', 'email', EmailCheck, [
	'host',
	'tld',
] as const);

export const url = createDecoratorGroup('property', 'url', UrlCheck, [
	'host',
	'tld',
	'protocol',
	'port',
] as const);

export const file = createDecoratorGroup('property', 'file', FileCheck, [
	'mimeType',
	'notEmpty',
	'minSize',
	'maxSize',
] as const);

export const image = createDecoratorGroup('property', 'image', ImageCheck, [
	'mimeType',
	'notEmpty',
	'minSize',
	'maxSize',
	'isImage',
	'minWidth',
	'minHeight',
	'maxWidth',
	'maxHeight',
] as const);

export const array = createDecoratorGroup('property', 'array', ArrayCheck, [
	'notEmpty',
	'minLength',
	'maxLength',
	'noDuplicates',
] as const);

export const item = {
	object: {
		...itemObjectRules,
		matchesType: items.matchesType,
	},
	string: createDecoratorGroup('item', 'string', StringCheck, [
		'minLength',
		'maxLength',
		'pattern',
		'oneOf',
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
	] as const),
	number: createDecoratorGroup('item', 'number', NumberCheck, [
		'integer',
		'minPrecision',
		'positive',
		'negative',
		'nonNegative',
		'greaterThan',
		'lessThan',
		'atLeast',
		'atMost',
	] as const),
	date: createDecoratorGroup('item', 'date', DateCheck, [
		'after',
		'before',
		'sameDay',
		'sameMonth',
		'sameYear',
		'withinMinutes',
		'withinHours',
		'withinDays',
		'withinMonths',
	] as const),
	email: createDecoratorGroup('item', 'email', EmailCheck, [
		'host',
		'tld',
	] as const),
	url: createDecoratorGroup('item', 'url', UrlCheck, [
		'host',
		'tld',
		'protocol',
		'port',
	] as const),
	file: createDecoratorGroup('item', 'file', FileCheck, [
		'mimeType',
		'notEmpty',
		'minSize',
		'maxSize',
	] as const),
	image: createDecoratorGroup('item', 'image', ImageCheck, [
		'mimeType',
		'notEmpty',
		'minSize',
		'maxSize',
		'isImage',
		'minWidth',
		'minHeight',
		'maxWidth',
		'maxHeight',
	] as const),
	array: createDecoratorGroup('item', 'array', ArrayCheck, [
		'notEmpty',
		'minLength',
		'maxLength',
		'noDuplicates',
	] as const),
};