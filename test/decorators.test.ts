import { describe, expect, it } from 'vitest';

import {
  ArrayCheck,
  array,
  item,
  items,
  matchesType,
  required,
  type,
  string,
  number,
  boolean,
  date,
  uuid,
  ulid,
  validateClass,
} from '../src';

function applyPropertyDecorators(
  target: object,
  property: string,
  decorators: Array<(targetObject: object, propertyKey: string | symbol) => void>,
): void {
  for (const decorator of decorators) {
    decorator(target, property);
  }
}

describe('decorator rule coverage', () => {
  it('supports string trim and equals decorators', async () => {
    class Payload {
      role!: string;
    }

    applyPropertyDecorators(Payload.prototype, 'role', [
      required(),
      type.string(),
      string.trim(),
      string.equals('admin', { case: 'insensitive' }),
    ]);

    const input = { role: '  ADMIN  ' };
    const check = await validateClass(input, Payload);

    expect(check.result().valid).toBe(true);
    expect(input.role).toBe('ADMIN');
  });

  it('supports number equals decorators', async () => {
    class Payload {
      value!: number;
    }

    applyPropertyDecorators(Payload.prototype, 'value', [
      required(),
      type.number({ tolerant: true }),
      number.equals(37),
    ]);

    const check = await validateClass({ value: '37' }, Payload);

    expect(check.result().valid).toBe(true);
  });

  it('supports boolean equals decorators', async () => {
    class Payload {
      enabled!: boolean;
    }

    applyPropertyDecorators(Payload.prototype, 'enabled', [
      required(),
      type.boolean({ tolerant: true }),
      boolean.equals(true),
    ]);

    const check = await validateClass({ enabled: 'true' }, Payload);

    expect(check.result().valid).toBe(true);
  });

  it('supports date equals decorators', async () => {
    class Payload {
      createdAt!: string;
    }

    applyPropertyDecorators(Payload.prototype, 'createdAt', [
      required(),
      type.date(),
      date.equals('2024-01-01T00:00:00.000Z'),
    ]);

    const check = await validateClass({ createdAt: '2024-01-01T00:00:00.000Z' }, Payload);

    expect(check.result().valid).toBe(true);
  });

  it('supports uuid and ulid specialized decorators', async () => {
    class Payload {
      id!: string;
      traceId!: string;
    }

    applyPropertyDecorators(Payload.prototype, 'id', [
      required(),
      type.uuid(),
      uuid.version(4),
    ]);

    applyPropertyDecorators(Payload.prototype, 'traceId', [
      required(),
      type.ulid(),
      ulid.isULID(),
    ]);

    const valid = await validateClass({
      id: '550e8400-e29b-41d4-a716-446655440000',
      traceId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    }, Payload);

    const invalid = await validateClass({
      id: '018f23c0-9f4a-7b2d-8c12-5f1d2c3b4a5e',
      traceId: '550e8400-e29b-41d4-a716-446655440000',
    }, Payload);

    expect(valid.result().valid).toBe(true);
    expect((invalid.result({ flattened: true }) as any).errors).toEqual(expect.arrayContaining([
      'Field id must be a valid UUIDv4',
      'Field traceId must be a valid ULID',
    ]));
  });

  it('uses hybrid mode by default for undecorated initialized fields', async () => {
    class Payload {
      role = '';
      enabled = false;
    }

    const valid = await validateClass({ role: 'admin', enabled: true }, Payload);
    const invalid = await validateClass({ role: 1, enabled: 'yes' }, Payload);

    expect(valid.result().valid).toBe(true);
    expect(invalid.result().valid).toBe(false);
  });

  it('can skip decorators and validate from inferred defaults only', async () => {
    class Payload {
      role = '';
    }

    applyPropertyDecorators(Payload.prototype, 'role', [
      required(),
      type.string(),
      string.equals('admin'),
    ]);

    const check = await validateClass({ role: 'guest' }, Payload, { skip: 'decorators' });

    expect(check.result().valid).toBe(true);
  });

  it('can skip inference and use decorators only', async () => {
    class Payload {
      role = '';
    }

    applyPropertyDecorators(Payload.prototype, 'role', [
      required(),
      type.string(),
      string.equals('admin'),
    ]);

    const check = await validateClass({ role: 'guest' }, Payload, { skip: 'inference' });

    expect(check.result().valid).toBe(false);
  });

  it('supports nested matchesType options on properties', async () => {
    class AddressDto {
      city!: string;
    }

    class Payload {
      address!: AddressDto;
    }

    applyPropertyDecorators(AddressDto.prototype, 'city', [
      required(),
      type.string(),
    ]);

    applyPropertyDecorators(Payload.prototype, 'address', [
      required(),
      matchesType(AddressDto, { noExtraFields: true }),
    ]);

    const valid = await validateClass({
      address: { city: 'Cairo' },
    }, Payload);

    const invalid = await validateClass({
      address: { city: 'Cairo', zip: '12345' },
    }, Payload);

    expect(valid.result().valid).toBe(true);
    expect(invalid.result().valid).toBe(false);
  });

  it('supports nested matchesType options on array items', async () => {
    class ChildDto {
      name!: string;
    }

    class FamilyDto {
      children!: ChildDto[];
    }

    applyPropertyDecorators(ChildDto.prototype, 'name', [
      required(),
      type.string(),
    ]);

    applyPropertyDecorators(FamilyDto.prototype, 'children', [
      required(),
      type.array(),
      items.object(),
      item.object.matchesType(ChildDto, { noExtraFields: true }),
    ]);

    const valid = await validateClass({
      children: [{ name: 'A' }],
    }, FamilyDto);

    const invalid = await validateClass({
      children: [{ name: 'A', extra: true }],
    }, FamilyDto);

    expect(valid.result().valid).toBe(true);
    expect(invalid.result().valid).toBe(false);
  });

  it('supports ArrayCheck.matchesType as a shorthand for item class validation', async () => {
    class ChildDto {
      name!: string;
    }

    applyPropertyDecorators(ChildDto.prototype, 'name', [
      required(),
      type.string(),
    ]);

    const valid = await ArrayCheck.for([{ name: 'A' }]).matchesType(ChildDto, { noExtraFields: true });
    const invalid = await ArrayCheck.for([{ name: 'A', extra: true }]).matchesType(ChildDto, { noExtraFields: true });

    expect(valid.result().valid).toBe(true);
    expect(invalid.result().valid).toBe(false);
  });

  it('supports array.matchesType decorators as shorthand for decorated array items', async () => {
    class ChildDto {
      name!: string;
    }

    class FamilyDto {
      children!: ChildDto[];
    }

    applyPropertyDecorators(ChildDto.prototype, 'name', [
      required(),
      type.string(),
    ]);

    applyPropertyDecorators(FamilyDto.prototype, 'children', [
      required(),
      type.array(),
      array.matchesType(ChildDto, { noExtraFields: true }),
    ]);

    const valid = await validateClass({ children: [{ name: 'A' }] }, FamilyDto);
    const invalid = await validateClass({ children: [{ name: 'A', extra: true }] }, FamilyDto);

    expect(valid.result().valid).toBe(true);
    expect(invalid.result().valid).toBe(false);
  });

  it('supports array contains decorators with item rules', async () => {
    class Payload {
      tags!: string[];
    }

    applyPropertyDecorators(Payload.prototype, 'tags', [
      required(),
      type.array(),
      array.contains({ minCount: 1, maxCount: 2 }),
      items.string(),
      item.string.trim(),
      item.string.minLength(2),
    ]);

    const validInput = { tags: [' x ', '  Ada  '] };
    const valid = await validateClass(validInput, Payload);
    const invalid = await validateClass({ tags: [' aa ', ' bb ', ' cc '] }, Payload);

    expect(valid.result().valid).toBe(true);
    expect(validInput.tags).toEqual([' x ', 'Ada']);
    expect((invalid.result({ flattened: true }) as any).errors).toContain(
      'Field tags must contain at most 2 items matching the required checks.',
    );
  });
});