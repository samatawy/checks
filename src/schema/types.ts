import type { CheckOptions } from '../checks/types';

export type RuleFlag = boolean | ({
  value?: boolean;
} & CheckOptions);

export type RuleValue<T> = T | ({
  value: T;
} & CheckOptions);

export interface CustomRuleSchema extends CheckOptions {
  use: string;
  args?: Record<string, unknown>;
}

export interface SchemaRoot {
  $schema?: string;
  schema: CheckSchema;
}

export type SchemaDocument = CheckSchema & {
  $schema?: string;
};

export type SchemaDefinition = CheckSchema | SchemaRoot | SchemaDocument;

export interface ObjectSchema {
  type: 'object';
  required?: RuleFlag;
  notEmpty?: RuleFlag;
  properties?: Record<string, CheckSchema>;
  rules?: CustomRuleSchema[];
}

export interface ArraySchema {
  type: 'array';
  required?: RuleFlag;
  notEmpty?: RuleFlag;
  minLength?: RuleValue<number>;
  maxLength?: RuleValue<number>;
  items?: CheckSchema;
  rules?: CustomRuleSchema[];
  itemRules?: CustomRuleSchema[];
}

export interface StringSchema {
  type: 'string';
  required?: RuleFlag;
  minLength?: RuleValue<number>;
  maxLength?: RuleValue<number>;
  oneOf?: RuleValue<string[]>;
  startsWith?: RuleValue<string>;
  endsWith?: RuleValue<string>;
  contains?: RuleValue<string>;
  pattern?: RuleValue<string>;
  case?: 'sensitive' | 'insensitive';
  rules?: CustomRuleSchema[];
}

export interface NumberSchema {
  type: 'number';
  required?: RuleFlag;
  greaterThan?: RuleValue<number | FieldRef>;
  lessThan?: RuleValue<number | FieldRef>;
  atLeast?: RuleValue<number | FieldRef>;
  atMost?: RuleValue<number | FieldRef>;
  rules?: CustomRuleSchema[];
}

export interface DateSchema {
  type: 'date';
  required?: RuleFlag;
  after?: RuleValue<DateRef>;
  before?: RuleValue<DateRef>;
  sameDay?: RuleValue<DateRef>;
  sameMonth?: RuleValue<DateRef>;
  sameYear?: RuleValue<DateRef>;
  withinMinutes?: RuleValue<{ value: DateRef; diff: number }>;
  withinHours?: RuleValue<{ value: DateRef; diff: number }>;
  withinDays?: RuleValue<{ value: DateRef; diff: number }>;
  withinMonths?: RuleValue<{ value: DateRef; diff: number }>;
  rules?: CustomRuleSchema[];
}

export interface BooleanSchema {
  type: 'boolean';
  required?: RuleFlag;
  rules?: CustomRuleSchema[];
}

export interface FileSchema {
  type: 'file';
  required?: RuleFlag;
  notEmpty?: RuleFlag;
  mimeType?: RuleValue<string>;
  minSize?: RuleValue<number>;
  maxSize?: RuleValue<number>;
  rules?: CustomRuleSchema[];
}

export interface ImageSchema {
  type: 'image';
  required?: RuleFlag;
  notEmpty?: RuleFlag;
  mimeType?: RuleValue<string>;
  minSize?: RuleValue<number>;
  maxSize?: RuleValue<number>;
  isImage?: RuleFlag;
  minWidth?: RuleValue<number>;
  minHeight?: RuleValue<number>;
  maxWidth?: RuleValue<number>;
  maxHeight?: RuleValue<number>;
  rules?: CustomRuleSchema[];
}

export type CheckSchema = ObjectSchema | ArraySchema | StringSchema | NumberSchema | DateSchema | BooleanSchema | FileSchema | ImageSchema;

export interface FieldRef {
  field?: string;
  $field?: string;
}

export type DateRef = Date | number | string | FieldRef;

export interface RelativeDateRule {
  value: DateRef;
  diff: number;
}

export interface SchemaRuleContext {
  path: Array<string | number>;
  field?: string | number;
  value: unknown;
  root: unknown;
  parent: unknown;
  schema: CheckSchema;
  args?: Record<string, unknown>;
}

export type SchemaRuleHandler = (value: unknown, context: SchemaRuleContext) => boolean | Promise<boolean>;

export type SchemaRuleRegistry = Record<string, SchemaRuleHandler>;

export interface SchemaInterpreterOptions {
  rules?: SchemaRuleRegistry;
}