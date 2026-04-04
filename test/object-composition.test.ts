import { describe, expect, it } from 'vitest';

import { ObjectCheck } from '../src';

describe('object composition', () => {
  it('applies winning anyOf branch mutations to the original input object', async () => {
    const input = {
      profile: {
        name: '  Ada  '
      }
    };

    const originalProfile = input.profile;

    const check = await ObjectCheck.for(input).check(root => [
      root.required('profile').object().anyOf([
        profile => [profile.required('name').string().trim().minLength(3)],
        profile => [profile.required('name').number()]
      ])
    ]);

    expect(check.result().valid).toBe(true);
    expect(input.profile).toBe(originalProfile);
    expect(input.profile.name).toBe('Ada');
  });

  it('applies winning FieldCheck anyOf branch mutations to the original field value', async () => {
    const input = {
      value: '37'
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('value').anyOf([
        field => [field.number({ tolerant: true }).greaterThan(10)],
        field => [field.string().minLength(5)]
      ])
    ]);

    expect(check.result().valid).toBe(true);
    expect(input.value).toBe(37);
  });

  it('applies winning ArrayCheck anyOf branch mutations to the original array items', async () => {
    const input = {
      tags: ['  Ada  ', '  Bob  ']
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('tags').array().anyOf([
        tags => [
          tags.checkEach(item => [item.string().trim().minLength(2)])
        ],
        tags => [tags.maxLength(1)]
      ])
    ]);

    expect(check.result().valid).toBe(true);
    expect(input.tags).toEqual(['Ada', 'Bob']);
  });

  it('applies winning ArrayItemCheck anyOf branch mutations to the original array item', async () => {
    const input = {
      values: ['  Ada  ']
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('values').array().checkEach(item => [
        item.anyOf([
          entry => [entry.string().trim().minLength(2)],
          entry => [entry.number().greaterThan(10)]
        ])
      ])
    ]);

    expect(check.result().valid).toBe(true);
    expect(input.values[0]).toBe('Ada');
  });

  it('fails FieldCheck oneOf when multiple branches are valid', async () => {
    const check = await ObjectCheck.for({
      value: '37'
    }).check(root => [
      root.required('value').oneOf([
        field => [field.number({ tolerant: true }).greaterThan(10)],
        field => [field.string().minLength(2)]
      ])
    ]);

    const result = check.result() as any;

    expect(result.valid).toBe(false);
    expect(result.results?.[0]?.err).toBe('Exactly one oneOf branch must be valid.');
  });

  it('fails ArrayCheck oneOf when no branch is valid and keeps branch errors', async () => {
    const check = await ObjectCheck.for({
      tags: ['A', 'B', 'C']
    }).check(root => [
      root.required('tags').array().oneOf([
        tags => [tags.maxLength(1)],
        tags => [tags.checkEach(item => [item.string().minLength(2)])]
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Exactly one oneOf branch must be valid.');
    expect(result.errors).toContain('Field tags must have at most 1 items.');
  });

  it('fails ArrayItemCheck oneOf when multiple branches are valid', async () => {
    const check = await ObjectCheck.for({
      values: ['37']
    }).check(root => [
      root.required('values').array().checkEach(item => [
        item.oneOf([
          entry => [entry.string().minLength(2)],
          entry => [entry.number({ tolerant: true }).greaterThan(10)]
        ])
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Exactly one oneOf branch must be valid.');
  });

  it('fails ObjectCheck not when the negated branch is valid without replaying mutations', async () => {
    const input = {
      profile: {
        name: '  Ada  '
      }
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('profile').object().not(profile => [
        profile.required('name').string().trim().minLength(3)
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Negated branch must not be valid.');
    expect(input.profile.name).toBe('  Ada  ');
  });

  it('fails FieldCheck not when the negated branch is valid without replaying mutations', async () => {
    const input = {
      value: '37'
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('value').not(field => [
        field.number({ tolerant: true }).greaterThan(10)
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Negated branch must not be valid.');
    expect(input.value).toBe('37');
  });

  it('fails ArrayCheck not when the negated branch is valid without replaying mutations', async () => {
    const input = {
      tags: ['  Ada  ']
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('tags').array().not(tags => [
        tags.checkEach(item => [item.string().trim().minLength(2)])
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Negated branch must not be valid.');
    expect(input.tags[0]).toBe('  Ada  ');
  });

  it('fails ArrayItemCheck not when the negated branch is valid without replaying mutations', async () => {
    const input = {
      values: ['37']
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('values').array().checkEach(item => [
        item.not(entry => [
          entry.number({ tolerant: true }).greaterThan(10)
        ])
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Negated branch must not be valid.');
    expect(input.values[0]).toBe('37');
  });
});