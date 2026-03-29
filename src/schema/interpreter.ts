import { ArrayCheck } from '../checks/array.check';
import { DateCheck } from '../checks/date.check';
import { FieldCheck } from '../checks/field.check';
import { buildErrorMessage, defined } from '../checks/helper.functions';
import { NumberCheck } from '../checks/number.check';
import { ObjectCheck } from '../checks/object.check';
import { StringCheck } from '../checks/string.check';
import type { Check, CheckOptions, IResult, StringCheckOptions } from '../checks/types';
import type {
  ArraySchema,
  BooleanSchema,
  CheckSchema,
  CustomRuleSchema,
  DateRef,
  DateSchema,
  FieldRef,
  FileSchema,
  ImageSchema,
  NumberSchema,
  ObjectSchema,
  RelativeDateRule,
  RuleFlag,
  RuleValue,
  SchemaDefinition,
  SchemaInterpreterOptions,
  SchemaRuleContext,
  StringSchema,
} from './types';

interface NormalizedRuleFlag extends CheckOptions {
  enabled: boolean;
}

interface NormalizedRuleValue<T> extends CheckOptions {
  enabled: boolean;
  value: T;
}

class ResultCheck implements Check {
  constructor(private readonly payload: IResult) {}

  public result(): IResult {
    return this.payload;
  }
}

const PASS_CHECK = new ResultCheck({ valid: true });

export async function createCheckFromSchema(
  input: unknown,
  schemaLike: SchemaDefinition,
  options: SchemaInterpreterOptions = {},
): Promise<Check> {
  const schema = unwrapRootSchema(schemaLike);

  switch (schema.type) {
    case 'object': {
      const check = ObjectCheck.for(input);
      return applyObjectSchema(check, schema, createContext(schema, input, input, [], undefined), options);
    }
    case 'array': {
      const check = ArrayCheck.for(input);
      return applyArraySchema(check, schema, createContext(schema, input, input, [], undefined), options);
    }
    default: {
      const root = { value: input };
      return buildFieldCheck(root, 'value', schema, createContext(schema, input, root, [], 'value'), options);
    }
  }
}

function unwrapRootSchema(schemaLike: SchemaDefinition): CheckSchema {
  return 'schema' in schemaLike ? schemaLike.schema : schemaLike;
}

function createContext(
  schema: CheckSchema,
  root: unknown,
  parent: unknown,
  path: Array<string | number>,
  field: string | number | undefined,
  args?: Record<string, unknown>,
): SchemaRuleContext {
  const context: SchemaRuleContext = {
    schema,
    root,
    parent,
    path,
    value: getValueAtPath(root, path),
  };

  if (defined(field)) {
    context.field = field;
  }

  if (defined(args)) {
    context.args = args;
  }

  return context;
}

function getValueAtPath(root: unknown, path: Array<string | number>): unknown {
  let current = root;

  for (const segment of path) {
    if (!defined(current) || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string | number, unknown>)[segment];
  }

  return current;
}

function hasValue(parent: unknown, key: string | number): boolean {
  return defined(parent) && typeof parent === 'object' && (parent as Record<string | number, unknown>)[key] !== null
    && (parent as Record<string | number, unknown>)[key] !== undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return defined(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRuleEnvelope(value: unknown): value is { value?: unknown; hint?: unknown; warn?: unknown; err?: unknown } {
  return isPlainObject(value) && ('value' in value || 'hint' in value || 'warn' in value || 'err' in value);
}

function normalizeFlag(rule: RuleFlag | undefined): NormalizedRuleFlag | null {
  if (rule === undefined) {
    return null;
  }

  if (typeof rule === 'boolean') {
    return { enabled: rule };
  }

  return {
    enabled: rule.value ?? true,
    hint: rule.hint,
    warn: rule.warn,
    err: rule.err,
  };
}

function normalizeValue<T>(rule: RuleValue<T> | undefined): NormalizedRuleValue<T> | null {
  if (rule === undefined) {
    return null;
  }

  if (isRuleEnvelope(rule)) {
    return {
      enabled: true,
      value: rule.value as T,
      hint: rule.hint as CheckOptions['hint'],
      warn: rule.warn as CheckOptions['warn'],
      err: rule.err as string | undefined,
    };
  }

  return {
    enabled: true,
    value: rule as T,
  };
}

function toCheckOptions(rule: CheckOptions | null | undefined): CheckOptions | undefined {
  if (!rule) {
    return undefined;
  }

  if (!defined(rule.hint) && !defined(rule.warn) && !defined(rule.err)) {
    return undefined;
  }

  return {
    hint: rule.hint,
    warn: rule.warn,
    err: rule.err,
  };
}

function createFailureCheck(field: string | number | undefined, defaultMessage: string, options?: CheckOptions): Check {
  const result = buildErrorMessage(defaultMessage, options);

  if (defined(field)) {
    result.field = field;
  }

  return new ResultCheck(result);
}

function resolveFieldRef(value: number | FieldRef): number | string {
  if (typeof value === 'number') {
    return value;
  }

  const ref = value.$field ?? value.field;
  if (!ref) {
    throw new Error('Field reference must define $field or field.');
  }
  return ref;
}

function resolveDateRef(value: DateRef): Date | number | string {
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    return value;
  }

  const ref = value.$field ?? value.field;
  if (!ref) {
    throw new Error('Date reference must define $field or field.');
  }
  return ref;
}

function defaultFieldLabel(field: string | number | undefined): string {
  return defined(field) ? `Field ${field}` : 'Input';
}

async function buildFieldCheck(
  parent: unknown,
  key: string | number,
  schema: CheckSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<Check> {
  const required = normalizeFlag(schema.required);

  if (required?.enabled && !hasValue(parent, key)) {
    return new FieldCheck(key, parent).required(toCheckOptions(required));
  }

  const field = new FieldCheck(key, parent);
  return applyFieldSchema(field, schema, context, options);
}

async function applyFieldSchema(
  field: FieldCheck,
  schema: CheckSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<Check> {
  switch (schema.type) {
    case 'object':
      return applyObjectSchema(field.object(), schema, context, options);
    case 'array':
      return applyArraySchema(field.array(), schema, context, options);
    case 'string':
      return applyStringSchema(field.string(), schema, context, options);
    case 'number':
      return applyNumberSchema(field.number(), schema, context, options);
    case 'date':
      return applyDateSchema(field.date(), schema, context, options);
    case 'boolean':
      return applyBooleanSchema(field.boolean(), schema, context, options);
    case 'file':
      return applyFileSchema(await field.file(), schema, context, options);
    case 'image':
      return applyImageSchema(await field.image(), schema, context, options);
  }
}

async function applyObjectSchema(
  check: ObjectCheck,
  schema: ObjectSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<ObjectCheck> {
  const currentValue = context.value;

  if (!defined(currentValue) && defined(context.field)) {
    return check;
  }

  const nestedChecks: Array<Check | Promise<Check>> = [];
  const notEmpty = normalizeFlag(schema.notEmpty);

  if (notEmpty?.enabled) {
    check.notEmpty(toCheckOptions(notEmpty));
  }

  if (isPlainObject(currentValue)) {
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      nestedChecks.push(
        buildFieldCheck(
          currentValue,
          key,
          propertySchema,
          createContext(propertySchema, context.root, currentValue, [...context.path, key], key),
          options,
        ),
      );
    }
  }

  nestedChecks.push(...buildCustomRuleChecks(schema.rules, context, options));

  if (nestedChecks.length) {
    await check.check(() => nestedChecks);
  }

  return check;
}

async function applyArraySchema(
  check: ArrayCheck,
  schema: ArraySchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<ArrayCheck> {
  const currentValue = context.value;

  if (!defined(currentValue) && defined(context.field)) {
    return check;
  }

  const nestedChecks: Array<Check | Promise<Check>> = [];
  const notEmpty = normalizeFlag(schema.notEmpty);
  const minLength = normalizeValue(schema.minLength);
  const maxLength = normalizeValue(schema.maxLength);

  if (notEmpty?.enabled) {
    check.notEmpty(toCheckOptions(notEmpty));
  }

  if (minLength?.enabled) {
    const ruleOptions = toCheckOptions(minLength);
    if (ruleOptions) {
      if (!Array.isArray(currentValue) || currentValue.length < minLength.value) {
        nestedChecks.push(createFailureCheck(context.field, `${defaultFieldLabel(context.field)} must have at least ${minLength.value} items.`, ruleOptions));
      }
    } else {
      check.minLength(minLength.value);
    }
  }

  if (maxLength?.enabled) {
    const ruleOptions = toCheckOptions(maxLength);
    if (ruleOptions) {
      if (!Array.isArray(currentValue) || currentValue.length > maxLength.value) {
        nestedChecks.push(createFailureCheck(context.field, `${defaultFieldLabel(context.field)} must have at most ${maxLength.value} items.`, ruleOptions));
      }
    } else {
      check.maxLength(maxLength.value);
    }
  }

  nestedChecks.push(...buildCustomRuleChecks(schema.rules, context, options));

  if (nestedChecks.length) {
    await check.check(() => nestedChecks);
  }

  if (Array.isArray(currentValue) && (schema.items || schema.itemRules?.length)) {
    let index = 0;
    await check.check_each(() => {
      const itemIndex = index++;
      const itemValue = currentValue[itemIndex];
      const itemChecks: Array<Check | Promise<Check>> = [];
      const itemPath = [...context.path, itemIndex];

      if (schema.items) {
        itemChecks.push(
          buildFieldCheck(
            currentValue,
            itemIndex,
            schema.items,
            createContext(schema.items, context.root, currentValue, itemPath, itemIndex),
            options,
          ),
        );
      }

      if (schema.itemRules?.length) {
        const itemSchema = schema.items ?? ({ type: 'object' } as CheckSchema);
        itemChecks.push(
          ...buildCustomRuleChecks(
            schema.itemRules,
            {
              schema: itemSchema,
              root: context.root,
              parent: currentValue,
              path: itemPath,
              field: itemIndex,
              value: itemValue,
            },
            options,
          ),
        );
      }

      return itemChecks;
    });
  }

  return check;
}

async function applyStringSchema(
  check: StringCheck,
  schema: StringSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<StringCheck> {
  const stringOptions = (rule?: CheckOptions): StringCheckOptions | undefined => {
    const base = toCheckOptions(rule);
    if (!base && !schema.case) {
      return undefined;
    }

    return {
      ...base,
      case: schema.case,
    };
  };

  const minLength = normalizeValue(schema.minLength);
  if (minLength?.enabled) {
    check.minLength(minLength.value, stringOptions(minLength));
  }

  const maxLength = normalizeValue(schema.maxLength);
  if (maxLength?.enabled) {
    check.maxLength(maxLength.value, stringOptions(maxLength));
  }

  const oneOf = normalizeValue(schema.oneOf);
  if (oneOf?.enabled) {
    check.oneOf(oneOf.value, stringOptions(oneOf));
  }

  const startsWith = normalizeValue(schema.startsWith);
  if (startsWith?.enabled) {
    check.startsWith(startsWith.value, stringOptions(startsWith));
  }

  const endsWith = normalizeValue(schema.endsWith);
  if (endsWith?.enabled) {
    check.endsWith(endsWith.value, stringOptions(endsWith));
  }

  const contains = normalizeValue(schema.contains);
  if (contains?.enabled) {
    check.contains(contains.value, stringOptions(contains));
  }

  const pattern = normalizeValue(schema.pattern);
  if (pattern?.enabled) {
    check.pattern(new RegExp(pattern.value), toCheckOptions(pattern));
  }

  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function applyNumberSchema(
  check: NumberCheck,
  schema: NumberSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<NumberCheck> {
  const greaterThan = normalizeValue(schema.greaterThan);
  if (greaterThan?.enabled) {
    check.greaterThan(resolveFieldRef(greaterThan.value), toCheckOptions(greaterThan));
  }

  const lessThan = normalizeValue(schema.lessThan);
  if (lessThan?.enabled) {
    check.lessThan(resolveFieldRef(lessThan.value), toCheckOptions(lessThan));
  }

  const atLeast = normalizeValue(schema.atLeast);
  if (atLeast?.enabled) {
    check.atLeast(resolveFieldRef(atLeast.value), toCheckOptions(atLeast));
  }

  const atMost = normalizeValue(schema.atMost);
  if (atMost?.enabled) {
    check.atMost(resolveFieldRef(atMost.value), toCheckOptions(atMost));
  }

  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function applyDateSchema(
  check: DateCheck,
  schema: DateSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<DateCheck> {
  const after = normalizeValue(schema.after);
  if (after?.enabled) {
    check.after(resolveDateRef(after.value), toCheckOptions(after));
  }

  const before = normalizeValue(schema.before);
  if (before?.enabled) {
    check.before(resolveDateRef(before.value), toCheckOptions(before));
  }

  const sameDay = normalizeValue(schema.sameDay);
  if (sameDay?.enabled) {
    check.sameDay(resolveDateRef(sameDay.value), toCheckOptions(sameDay));
  }

  const sameMonth = normalizeValue(schema.sameMonth);
  if (sameMonth?.enabled) {
    check.sameMonth(resolveDateRef(sameMonth.value), toCheckOptions(sameMonth));
  }

  const sameYear = normalizeValue(schema.sameYear);
  if (sameYear?.enabled) {
    check.sameYear(resolveDateRef(sameYear.value), toCheckOptions(sameYear));
  }

  const withinMinutes = normalizeValue<RelativeDateRule>(schema.withinMinutes);
  if (withinMinutes?.enabled) {
    const value = withinMinutes.value;
    check.withinMinutes(resolveDateRef(value.value), value.diff, toCheckOptions(withinMinutes));
  }

  const withinHours = normalizeValue<RelativeDateRule>(schema.withinHours);
  if (withinHours?.enabled) {
    const value = withinHours.value;
    check.withinHours(resolveDateRef(value.value), value.diff, toCheckOptions(withinHours));
  }

  const withinDays = normalizeValue<RelativeDateRule>(schema.withinDays);
  if (withinDays?.enabled) {
    const value = withinDays.value;
    check.withinDays(resolveDateRef(value.value), value.diff, toCheckOptions(withinDays));
  }

  const withinMonths = normalizeValue<RelativeDateRule>(schema.withinMonths);
  if (withinMonths?.enabled) {
    const value = withinMonths.value;
    check.withinMonths(resolveDateRef(value.value), value.diff, toCheckOptions(withinMonths));
  }

  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function applyBooleanSchema(
  check: FieldCheck,
  schema: BooleanSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<FieldCheck> {
  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function applyFileSchema(
  check: Awaited<ReturnType<FieldCheck['file']>>,
  schema: FileSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<Awaited<ReturnType<FieldCheck['file']>>> {
  const notEmpty = normalizeFlag(schema.notEmpty);
  if (notEmpty?.enabled) {
    check.notEmpty(toCheckOptions(notEmpty));
  }

  const mimeType = normalizeValue(schema.mimeType);
  if (mimeType?.enabled) {
    check.mimeType(mimeType.value, toCheckOptions(mimeType));
  }

  const minSize = normalizeValue(schema.minSize);
  if (minSize?.enabled) {
    check.minSize(minSize.value, toCheckOptions(minSize));
  }

  const maxSize = normalizeValue(schema.maxSize);
  if (maxSize?.enabled) {
    check.maxSize(maxSize.value, toCheckOptions(maxSize));
  }

  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function applyImageSchema(
  check: Awaited<ReturnType<FieldCheck['image']>>,
  schema: ImageSchema,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<Awaited<ReturnType<FieldCheck['image']>>> {
  const notEmpty = normalizeFlag(schema.notEmpty);
  if (notEmpty?.enabled) {
    check.notEmpty(toCheckOptions(notEmpty));
  }

  const mimeType = normalizeValue(schema.mimeType);
  if (mimeType?.enabled) {
    check.mimeType(mimeType.value, toCheckOptions(mimeType));
  }

  const minSize = normalizeValue(schema.minSize);
  if (minSize?.enabled) {
    check.minSize(minSize.value, toCheckOptions(minSize));
  }

  const maxSize = normalizeValue(schema.maxSize);
  if (maxSize?.enabled) {
    check.maxSize(maxSize.value, toCheckOptions(maxSize));
  }

  const isImage = normalizeFlag(schema.isImage);
  if (isImage?.enabled) {
    check.isImage(toCheckOptions(isImage));
  }

  const minWidth = normalizeValue(schema.minWidth);
  if (minWidth?.enabled) {
    check.minWidth(minWidth.value, toCheckOptions(minWidth));
  }

  const minHeight = normalizeValue(schema.minHeight);
  if (minHeight?.enabled) {
    check.minHeight(minHeight.value, toCheckOptions(minHeight));
  }

  const maxWidth = normalizeValue(schema.maxWidth);
  if (maxWidth?.enabled) {
    check.maxWidth(maxWidth.value, toCheckOptions(maxWidth));
  }

  const maxHeight = normalizeValue(schema.maxHeight);
  if (maxHeight?.enabled) {
    check.maxHeight(maxHeight.value, toCheckOptions(maxHeight));
  }

  await appendCustomRules(check, schema.rules, context, options);
  return check;
}

async function appendCustomRules(
  check: Check,
  rules: CustomRuleSchema[] | undefined,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Promise<void> {
  if (!rules?.length || !defined(context.value)) {
    return;
  }

  const target = check as Check & {
    is_true?: (func: (data: unknown) => boolean | Promise<boolean>, options?: CheckOptions) => Promise<Check>;
  };

  if (!target.is_true) {
    throw new Error('Custom schema rules require a check instance that supports is_true().');
  }

  for (const rule of rules) {
    const evaluator = options.rules?.[rule.use];

    if (!evaluator) {
      throw new Error(`Schema rule "${rule.use}" was not found in the rule registry.`);
    }

    await target.is_true(
      async () => evaluator(context.value, {
        ...context,
        args: rule.args,
      }),
      toCheckOptions(rule) ?? { err: `Custom rule ${rule.use} failed` },
    );
  }
}

function buildCustomRuleChecks(
  rules: CustomRuleSchema[] | undefined,
  context: SchemaRuleContext,
  options: SchemaInterpreterOptions,
): Array<Promise<Check>> {
  return (rules ?? []).map(async rule => {
    const evaluator = options.rules?.[rule.use];

    if (!evaluator) {
      throw new Error(`Schema rule "${rule.use}" was not found in the rule registry.`);
    }

    if (!defined(context.value)) {
      return PASS_CHECK;
    }

    const valid = await evaluator(context.value, {
      ...context,
      args: rule.args,
    });

    if (valid) {
      return PASS_CHECK;
    }

    return createFailureCheck(context.field, `Custom rule ${rule.use} failed`, toCheckOptions(rule));
  });
}
