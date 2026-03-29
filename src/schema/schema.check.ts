import type { Check, IResult, ResultSet } from '../checks/types';
import { createCheckFromSchema } from './interpreter';
import type { SchemaDefinition, SchemaInterpreterOptions } from './types';

function hasCollect(check: Check): check is Check & {
  collect: () => ResultSet;
} {
  return 'collect' in check && typeof check.collect === 'function';
}

export class SchemaCheck {
  private readonly schema: SchemaDefinition;

  private readonly options: SchemaInterpreterOptions;

  constructor(schema: SchemaDefinition, options: SchemaInterpreterOptions = {}) {
    this.schema = schema;
    this.options = options;
  }

  static from(schema: SchemaDefinition, options: SchemaInterpreterOptions = {}): SchemaCheck {
    return new SchemaCheck(schema, options);
  }

  static async for(input: unknown, schema: SchemaDefinition, options: SchemaInterpreterOptions = {}): Promise<Check> {
    return createCheckFromSchema(input, schema, options);
  }

  public async check(input: unknown): Promise<Check> {
    return createCheckFromSchema(input, this.schema, this.options);
  }

  public async result(input: unknown): Promise<IResult | ResultSet> {
    const check = await this.check(input);

    if (hasCollect(check)) {
      return check.collect();
    }

    return check.result();
  }
}