import { describe, expect, it } from 'vitest';

import { ObjectCheck } from '../src';
import { SchemaCheck } from '../src/schema/schema.check';

type SchemaInput = Parameters<typeof SchemaCheck.from>[0];

describe('equals checks', () => {
  it('uses strict equality by default on ValueCheck', async () => {
    const check = await ObjectCheck.for({ value: '37' }).check(root => [
      root.required('value').equals(37)
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field value must equal 37');
  });

  it('supports tolerant equality on ValueCheck', async () => {
    const check = await ObjectCheck.for({ value: '37' }).check(root => [
      root.required('value').equals(37, { tolerant: true })
    ]);

    expect(check.result().valid).toBe(true);
  });

  it('supports case-insensitive string equality', async () => {
    const check = await ObjectCheck.for({ role: 'ADMIN' }).check(root => [
      root.required('role').string().equals('admin', { case: 'insensitive' })
    ]);

    expect(check.result().valid).toBe(true);
  });

  it('supports case-insensitive equality directly on FieldCheck', async () => {
    const check = await ObjectCheck.for({ role: 'ADMIN' }).check(root => [
      root.required('role').equals('admin', { case: 'insensitive' })
    ]);

    expect(check.result().valid).toBe(true);
  });

  it('normalizes mixed string and non-string values before case-insensitive equality', async () => {
    const check = await ObjectCheck.for({ value: 37 }).check(root => [
      root.required('value').equals('37', { case: 'insensitive' })
    ]);

    expect(check.result().valid).toBe(true);
  });

  it('keeps string equality case-sensitive by default', async () => {
    const check = await ObjectCheck.for({ role: 'ADMIN' }).check(root => [
      root.required('role').string().equals('admin')
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field role must equal "admin"');
  });

  it('does not add an equals error when StringCheck already failed its type check', async () => {
    const check = await ObjectCheck.for({ role: 123 }).check(root => [
      root.required('role').string().equals('admin')
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field role must be a string');
    expect(result.errors).not.toContain('Field role must equal "admin"');
  });

  it('does not add an equals error when NumberCheck already failed its type check', async () => {
    const check = await ObjectCheck.for({ value: 'abc' }).check(root => [
      root.required('value').number().equals(37)
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field value must be a number');
    expect(result.errors).not.toContain('Field value must equal 37');
  });
});

describe('SchemaCheck const support', () => {
  it('supports string const constraints through equals()', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['role'],
      properties: {
        role: {
          type: 'string',
          const: 'admin'
        }
      }
    };

    const valid = await SchemaCheck.from(schema).result({ role: 'admin' });
    const invalid = await SchemaCheck.from(schema).result({ role: 'user' }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Field role must equal "admin"');
  });

  it('supports number const constraints through equals()', async () => {
    const schema: SchemaInput = {
      type: 'object',
      required: ['count'],
      properties: {
        count: {
          type: 'number',
          const: 3
        }
      }
    };

    const valid = await SchemaCheck.from(schema).result({ count: 3 });
    const invalid = await SchemaCheck.from(schema).result({ count: 4 }, { flattened: true });

    expect(valid.valid).toBe(true);
    expect((invalid as any).errors).toContain('Field count must equal 3');
  });
});