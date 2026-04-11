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

  it('passes old and new values to canUpdate through nested field and array item checkers', async () => {
    const current = {
      profile: {
        name: 'Ada',
        tags: ['new']
      }
    };

    const previous = {
      profile: {
        name: 'Grace',
        tags: ['old']
      }
    };

    let fieldOldValue: unknown;
    let fieldNewValue: unknown;
    let itemOldValue: unknown;
    let itemNewValue: unknown;

    await ObjectCheck.for(current)
      .updating(previous)
      .check(root => [
        root.required('profile').object().check(profile => {
          const nameCheck = profile.required('name').string();
          const tagsCheck = profile.required('tags').array();

          return [
            nameCheck.canUpdate((oldValue, newValue) => {
              fieldOldValue = oldValue;
              fieldNewValue = newValue;
              return true;
            }),
            tagsCheck.checkEach(item => {
              const stringCheck = item.string();

              return [
                stringCheck.canUpdate((oldValue, newValue) => {
                  itemOldValue = oldValue;
                  itemNewValue = newValue;
                  return true;
                })
              ];
            })
          ];
        })
      ]);

    expect(fieldOldValue).toBe('Grace');
    expect(fieldNewValue).toBe('Ada');
    expect(itemOldValue).toBe('old');
    expect(itemNewValue).toBe('new');
  });

  it('fails canUpdate with an update-specific error message', async () => {
    const check = await ObjectCheck.for({ name: 'Ada' })
      .updating({ name: 'Grace' })
      .check(root => [
        root.required('name').string().canUpdate((oldValue, newValue) => oldValue === newValue)
      ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field name cannot be updated from "Grace" to "Ada"');
  });

  it('fails immutable when a defined field value changes', async () => {
    const check = await ObjectCheck.for({ name: 'Ada' })
      .updating({ name: 'Grace' })
      .check(root => [
        root.required('name').string().immutable()
      ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field name is immutable and cannot be updated from "Grace" to "Ada"');
  });

  it('allows immutable fields to be set when no previous value exists', async () => {
    const check = await ObjectCheck.for({ name: 'Ada' })
      .updating({})
      .check(root => [
        root.required('name').string().immutable()
      ]);

    expect(check.result().valid).toBe(true);
  });

  it('ignores immutable when an update patch omits the field', async () => {
    const check = await ObjectCheck.for({ title: 'Architect' })
      .updating({ name: 'Ada', title: 'Engineer' })
      .check(root => [
        root.optional('name').string().immutable(),
        root.optional('title').string()
      ]);

    expect(check.result().valid).toBe(true);
  });

  it('passes added and deleted array items to canAdd and canDelete', async () => {
    const current = {
      tags: ['admin', 'editor']
    };

    const previous = {
      tags: ['editor', 'viewer']
    };

    const added: unknown[] = [];
    const deleted: unknown[] = [];

    await ObjectCheck.for(current)
      .updating(previous)
      .check(root => [
        root.required('tags').array()
          .canAdd((array, item) => {
            added.push(item);
            expect(array).toEqual(['admin', 'editor']);
            return true;
          })
          .then(check => check.canDelete((array, item) => {
            deleted.push(item);
            expect(array).toEqual(['editor', 'viewer']);
            return true;
          }))
      ]);

    expect(added).toEqual(['admin']);
    expect(deleted).toEqual(['viewer']);
  });

  it('fails canAdd and canDelete when array updates violate the predicate', async () => {
    const check = await ObjectCheck.for({ tags: ['admin', 'editor'] })
      .updating({ tags: ['editor', 'viewer'] })
      .check(root => [
        root.required('tags').array()
          .canAdd((_, item) => item !== 'admin')
          .then(arrayCheck => arrayCheck.canDelete((_, item) => item !== 'viewer'))
      ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field tags cannot add item "admin"');
    expect(result.errors).toContain('Field tags cannot delete item "viewer"');
  });

  it('handles duplicate array additions and deletions separately', async () => {
    const added: unknown[] = [];
    const deleted: unknown[] = [];

    await ObjectCheck.for({ tags: ['a', 'a', 'b'] })
      .updating({ tags: ['a', 'b', 'b'] })
      .check(root => [
        root.required('tags').array()
          .canAdd((_, item) => {
            added.push(item);
            return true;
          })
          .then(arrayCheck => arrayCheck.canDelete((_, item) => {
            deleted.push(item);
            return true;
          }))
      ]);

    expect(added).toEqual(['a']);
    expect(deleted).toEqual(['b']);
  });

  it('fails immutable on object and array checks when a defined value changes', async () => {
    const check = await ObjectCheck.for({
      profile: { name: 'Ada' },
      tags: ['new']
    })
      .updating({
        profile: { name: 'Grace' },
        tags: ['old']
      })
      .check(root => [
        root.required('profile').object().immutable(),
        root.required('tags').array().immutable()
      ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field profile is immutable and cannot be updated from {"name":"Grace"} to {"name":"Ada"}');
    expect(result.errors).toContain('Field tags is immutable and cannot be updated from ["old"] to ["new"]');
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

  it('replays matching array contains item mutations without replaying non-matches', async () => {
    const input = {
      tags: [' x ', '  Ada  ']
    };

    const check = await ObjectCheck.for(input).check(root => [
      root.required('tags').array().contains(item => [
        item.string().trim().minLength(2)
      ])
    ]);

    expect(check.result().valid).toBe(true);
    expect(input.tags).toEqual([' x ', 'Ada']);
  });

  it('fails array contains with one aggregate error when no items match', async () => {
    const check = await ObjectCheck.for({
      tags: [' a ', ' b ']
    }).check(root => [
      root.required('tags').array().contains(item => [
        item.string().trim().minLength(2)
      ])
    ]);

    const result = check.result({ flattened: true }) as any;

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Field tags must contain at least one item matching the required checks.');
    expect(result.errors).not.toContain('Field 0 must be at least 2 characters long');
    expect(result.errors).not.toContain('Field 1 must be at least 2 characters long');
  });

  it('supports array contains min and max bounds together', async () => {
    const valid = await ObjectCheck.for({
      values: [10, 12, 3]
    }).check(root => [
      root.required('values').array().contains(item => [
        item.number().atLeast(10)
      ], {
        minCount: 1,
        maxCount: 2
      })
    ]);

    const tooMany = await ObjectCheck.for({
      values: [10, 12, 14]
    }).check(root => [
      root.required('values').array().contains(item => [
        item.number().atLeast(10)
      ], {
        minCount: 1,
        maxCount: 2
      })
    ]);

    expect(valid.result().valid).toBe(true);
    expect((tooMany.result({ flattened: true }) as any).errors).toContain(
      'Field values must contain at most 2 items matching the required checks.',
    );
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