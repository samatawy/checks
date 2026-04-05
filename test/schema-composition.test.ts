import { describe, expect, it } from 'vitest';

import { SchemaCheck } from '../src/schema/schema.check';

type SchemaInput = Parameters<typeof SchemaCheck.from>[0];

describe('SchemaCheck composition', () => {
  it('supports not on the root object schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      not: {
        properties: {
          role: { type: 'string', const: 'admin' }
        },
        required: ['role']
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ role: 'user' });
    const invalid = await SchemaCheck.from(schema).checkResult({ role: 'admin' }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Input must not match the excluded schema');
  });

  it('supports not on a field schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          type: 'string',
          not: {
            type: 'string',
            const: 'blocked'
          }
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ value: 'allowed' });
    const invalid = await SchemaCheck.from(schema).checkResult({ value: 'blocked' }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('value must not match the excluded schema');
  });

  it('supports allOf on the root object schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      allOf: [
        {
          properties: {
            name: { type: 'string', minLength: 2 }
          },
          required: ['name']
        },
        {
          properties: {
            age: { type: 'number', minimum: 18 }
          },
          required: ['age']
        }
      ]
    };

    const valid = await SchemaCheck.from(schema).checkResult({ name: 'Ada', age: 37 });
    const invalid = await SchemaCheck.from(schema).checkResult({ name: 'A', age: 12 }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Field name must be at least 2 characters long');
    expect((invalid as any).errors).toContain('Field age must be a number at least 18');
  });

  it('supports allOf on a field schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          allOf: [
            { type: 'string', minLength: 2 },
            { type: 'string', pattern: '^A' }
          ]
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ value: 'Ada' });
    const invalid = await SchemaCheck.from(schema).checkResult({ value: 'ba' }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Field value does not match the required pattern');
  });

  it('supports anyOf on a field schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['value'],
      properties: {
        value: {
          anyOf: [
            { type: 'string', minLength: 2 },
            { type: 'number', minimum: 10 }
          ]
        }
      }
    };

    const validString = await SchemaCheck.from(schema).checkResult({ value: 'ok' });
    const validNumber = await SchemaCheck.from(schema).checkResult({ value: 12 });
    const invalid = await SchemaCheck.from(schema).checkResult({ value: 1 }, { flattened: true });

    expect(validString.valid).toBe(true);
    expect(validNumber.valid).toBe(true);
    expect((invalid as any).errors).toContain('At least one anyOf branch must be valid.');
  });

  it('supports oneOf on the root object schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      oneOf: [
        {
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        },
        {
          properties: {
            phone: { type: 'string', minLength: 10 }
          },
          required: ['phone']
        }
      ]
    };

    const valid = await SchemaCheck.from(schema).checkResult({ email: 'user@example.com' });
    const invalid = await SchemaCheck.from(schema).checkResult({ email: 'user@example.com', phone: '0123456789' }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Exactly one oneOf branch must be valid.');
  });

  it('supports anyOf on an array schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['tags'],
      properties: {
        tags: {
          type: 'array',
          anyOf: [
            { maxItems: 1 },
            {
              items: { type: 'string', minLength: 2 }
            }
          ]
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ tags: ['ab', 'cd'] });

    expect(valid.valid).toBe(true);
  });

  it('supports contains on an array schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['tags'],
      properties: {
        tags: {
          type: 'array',
          contains: {
            type: 'string',
            minLength: 2
          }
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ tags: ['a', 'bc'] });
    const invalid = await SchemaCheck.from(schema).checkResult({ tags: ['a', 'b'] }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('tags must contain at least one item matching the required schema');
  });

  it('supports minContains on an array schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['values'],
      properties: {
        values: {
          type: 'array',
          contains: {
            type: 'number',
            minimum: 10
          },
          minContains: 2
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ values: [10, 12, 3] });
    const invalid = await SchemaCheck.from(schema).checkResult({ values: [10, 3, 4] }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('values must contain at least 2 items matching the required schema');
  });

  it('supports maxContains on an array schema', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['values'],
      properties: {
        values: {
          type: 'array',
          contains: {
            type: 'number',
            minimum: 10
          },
          maxContains: 1
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ values: [10, 2, 3] });
    const invalid = await SchemaCheck.from(schema).checkResult({ values: [10, 12, 3] }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('values must contain at most one item matching the required schema');
  });

  it('supports minContains and maxContains together', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['values'],
      properties: {
        values: {
          type: 'array',
          contains: {
            type: 'number',
            minimum: 10
          },
          minContains: 1,
          maxContains: 2
        }
      }
    };

    const valid = await SchemaCheck.from(schema).checkResult({ values: [10, 12, 3] });
    const tooFew = await SchemaCheck.from(schema).checkResult({ values: [1, 2, 3] }, { flattened: true });
    const tooMany = await SchemaCheck.from(schema).checkResult({ values: [10, 12, 14] }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((tooFew as any).errors).toContain('values must contain at least one item matching the required schema');
    expect((tooMany as any).errors).toContain('values must contain at most 2 items matching the required schema');
  });

  it('requires contains when using minContains or maxContains', async () => {
    await expect(SchemaCheck.from({
      type: 'object',
      properties: {
        values: {
          type: 'array',
          minContains: 1
        }
      }
    }).check({ values: [] })).rejects.toThrow('Keyword "minContains" requires "contains" at values.');

    await expect(SchemaCheck.from({
      type: 'object',
      properties: {
        values: {
          type: 'array',
          maxContains: 1
        }
      }
    }).check({ values: [] })).rejects.toThrow('Keyword "maxContains" requires "contains" at values.');
  });

  it('supports oneOf on array item schemas', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['values'],
      properties: {
        values: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'number', minimum: 10 },
              { type: 'number', maximum: 100 }
            ]
          }
        }
      }
    };

    const invalid = await SchemaCheck.from(schema).checkResult({ values: [50] }, { flattened: true });

    expect(invalid.valid).toBe(false);
    expect((invalid as any).errors).toContain('Exactly one oneOf branch must be valid.');
  });

  it('stores the last check result for result()', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          minLength: 2
        }
      }
    };

    const schemaCheck = SchemaCheck.from(schema);

    await schemaCheck.check({ name: 'A' });

    const cached = schemaCheck.result({ flattened: true }) as any;

    expect(cached.valid).toBe(false);
    expect(cached.errors).toContain('Field name must be at least 2 characters long');
  });

  it('returns a default error from result() before any check runs', () => {
    const schemaCheck = SchemaCheck.from({ type: 'object' });

    expect(schemaCheck.result()).toEqual({ valid: false, err: 'No check has been performed yet' });
  });
});