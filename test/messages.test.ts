import { afterEach, describe, expect, it } from 'vitest';

import { FieldCheck, ObjectCheck, ResultCatalog } from '../src';

describe('global check message catalog', () => {
  afterEach(() => {
    ResultCatalog.global.clear();
  });

  it('translates a coded field result and exposes the code', () => {
    ResultCatalog.global.register('person.name.missing', {
      warn: {
        en: 'Name is missing',
        de: 'Name fehlt',
        ar: 'الاسم مفقود'
      }
    });

    const result = new FieldCheck('name', {}).required({
      code: 'person.name.missing'
    }).result({ language: 'de' });

    expect(result.valid).toBe(true);
    expect(result.code).toBe('person.name.missing');
    expect(result.warn).toBe('Name fehlt');
    expect(result.err).toBeUndefined();
  });

  it('defaults coded results to english when a formatted result is requested without a language', () => {
    ResultCatalog.global.register('person.name.missing', {
      err: 'Name is required'
    });

    const result = new FieldCheck('name', {}).required({
      code: 'person.name.missing'
    }).result({ language: undefined });

    expect(result.valid).toBe(false);
    expect(result.code).toBe('person.name.missing');
    expect(result.err).toBe('Name is required');
  });

  it('supports string shorthand definitions as english translations', () => {
    ResultCatalog.global.register('person.name.guidance', {
      hint: 'Add the legal full name when available',
      warn: 'Name is missing'
    });

    const result = new FieldCheck('name', {}).required({
      code: 'person.name.guidance'
    }).result({ language: undefined });

    expect(result.valid).toBe(true);
    expect(result.code).toBe('person.name.guidance');
    expect(result.hint).toBe('Add the legal full name when available');
    expect(result.warn).toBe('Name is missing');
  });

  it('keeps coded errors when buildErrorMessage is used and the registry matches', async () => {
    ResultCatalog.global.register('children.minor', {
      err: {
        en: 'All children must be minors'
      }
    });

    const check = await ObjectCheck.for({
      children: [{ age: 26 }]
    }).check(person => [
      person.optional('children').array().is_true_each(child => {
        if (child.age !== undefined && child.age >= 18) {
          return false;
        }
        return true;
      }, { code: 'children.minor' })
    ]);

    const english = check.result({ raw: true, flattened: true, language: 'en' }) as any;
    const french = check.result({ raw: true, flattened: true, language: 'fr' }) as any;

    expect(english.errors).toEqual(['All children must be minors']);
    expect(french.errors).toEqual(['Field children[0]: Custom check failed']);
    expect(english.raw.results[0].results[0].code).toBe('children.minor');
  });

  it('aggregates translated coded messages in flattened object results', async () => {
    ResultCatalog.global.register('person.name.missing', {
      warn: {
        en: 'Name is missing',
        de: 'Name fehlt'
      }
    });

    const check = await ObjectCheck.for({}).check(person => [
      person.required('name', { code: 'person.name.missing' })
    ]);

    const result = check.result({ flattened: true, language: 'de' });

    expect(result).toHaveProperty('valid', true);
    expect(result).toHaveProperty('warnings', ['Name fehlt']);
  });

  it('supports scoped result catalogs through separate instances', () => {
    const catalog = new ResultCatalog();
    catalog.register('person.name.missing', {
      warn: {
        en: 'Name is missing',
        de: 'Name fehlt'
      }
    });

    const result = new FieldCheck('name', {}).required({
      code: 'person.name.missing',
      catalog
    }).result({
      language: 'de',
      catalog
    });

    expect(result.valid).toBe(true);
    expect(result.code).toBe('person.name.missing');
    expect(result.warn).toBe('Name fehlt');
  });

  it('supports multiple translated levels for the same code', () => {
    ResultCatalog.global.register('person.name.missing', {
      hint: {
        en: 'Add the legal full name when available',
        de: 'Ergaenze den vollstaendigen Namen, wenn verfuegbar'
      },
      err: {
        en: 'Name is required',
        de: 'Name ist erforderlich'
      }
    });

    const result = new FieldCheck('name', {}).required({
      code: 'person.name.missing'
    }).result({ language: 'de' });

    expect(result.valid).toBe(false);
    expect(result.code).toBe('person.name.missing');
    expect(result.hint).toBe('Ergaenze den vollstaendigen Namen, wenn verfuegbar');
    expect(result.err).toBe('Name ist erforderlich');
  });

  it('falls back to the original generated text when a requested language is missing', () => {
    ResultCatalog.global.register('person.name.missing', {
      err: 'Name is required'
    });

    const check = new FieldCheck('name', {}).required({
      code: 'person.name.missing'
    });

    const english = check.result({ language: 'en' });
    const french = check.result({ language: 'fr' });

    expect(english.err).toBe('Name is required');
    expect(french.err).toBe('Field name is required');
    expect(french.code).toBe('person.name.missing');
  });

  it('does not duplicate unnamed array errors when multiple checks target the same field', async () => {
    const check = await ObjectCheck.for({
      children: [
        { name: 'Nour' },
        { nam2e: 'Sirag', age: '26' },
        { nam2e: 'Ali' }
      ]
    }).check(person => [
      person.optional('children').array()
        .check_each(child => [
          child.object(),
          child.required('name').string(),
          child.optional('age').number()
        ]),
      person.optional('children').array()
        .is_true_each(child => {
          if (child.age !== undefined && child.age >= 18) {
            return false;
          }
          return true;
        }, { err: 'All children must be minors' })
    ]);

    const result = check.result({ raw: true, nested: true, flattened: true }) as any;

    expect(result.raw.results.find((entry: any) => entry.field === 'children').results).toEqual([
      {
        field: 1,
        valid: false,
        results: [
          {
            field: 'name',
            valid: false,
            err: 'Field name is required'
          },
          {
            field: 'age',
            valid: false,
            err: 'Field age must be a number'
          }
        ]
      },
      {
        field: 2,
        valid: false,
        results: [
          {
            field: 'name',
            valid: false,
            err: 'Field name is required'
          }
        ]
      },
      {
        valid: false,
        err: 'All children must be minors'
      }
    ]);

    expect(result.errors.filter((entry: string) => entry === 'All children must be minors')).toEqual([
      'All children must be minors'
    ]);
  });

  it('does not duplicate unnamed array errors for the person sample payload with numeric child age', async () => {
    const input = {
      name: 'Samh',
      gender: 'f',
      age: null,
      salary: 1200,
      tax: 2200,
      address: {
        str2eet: '103 Osbaldeston',
        city: 'London',
        country: 'UK'
      },
      child_count: 4,
      child_names: ['Nour', 'Sirag'],
      children: [
        { nam2e: 'Nour' },
        { name: 'Sirag', age: 26 },
        { name: 'Ali' }
      ],
      phone: [{ number: '01234' }, { number: 12345, type: 'mobile' }]
    };

    const check = await ObjectCheck.for(input).notEmpty().noExtraFields().check(person => [
      person.required('name').string().minLength(5, { err: 'Name is too short' }),
      person.optional('name').string().maxLength(2, { err: 'Name is too long' }),
      person.optional('gender').string().oneOf(['male', 'female', 'm', 'f'], { case: 'insensitive' }),
      person.optional('age').number().greaterThan(0).atMost(150),
      person.conditional('age', data => data.gender === 'male' || data.gender === 'm', { err: 'Age is required for males' }),
      person.optional('salary').number().greaterThan('tax', { err: 'Salary must be greater than tax' }),
      person.required('address').object().check(address => [
        address.required('street').string(),
        address.required('city').string(),
        address.optional('zip').string().pattern(/^\d{5}(-\d{4})?$/)
      ]),
      person.optional('children').array().maxLength(10)
        .check_each(child => [
          child.object(),
          child.required('name').string(),
          child.optional('age').number().greaterThan(0).atMost(150)
        ]),
      person.optional('children').array()
        .is_true_each(child => {
          if (child.age !== undefined && child.age >= 18) {
            return false;
          }
          return true;
        }, { err: 'All children must be minors' }),
      person.is_true(data => {
        if ((data.child_count || 0) != (data.children?.length || 0)) return false;
        return true;
      }, { err: 'Child count should equal the number of children' })
    ]);

    const result = check.result({ raw: true, nested: true, flattened: true }) as any;
    const children = result.raw.results.find((entry: any) => entry.field === 'children');

    expect(children.results.filter((entry: any) => entry.err === 'All children must be minors')).toHaveLength(1);
    expect(result.errors.filter((entry: string) => entry === 'All children must be minors')).toHaveLength(1);
  });

  it('does not duplicate child errors when a later root is_true returns the same object', async () => {
    const input = {
      name: 'Samh',
      salary: 1200,
      tax: 2200,
      address: {
        str2eet: '103 Osbaldeston',
        city: 'London',
        country: 'UK'
      },
      child_count: 4,
      child_names: ['Nour', 'Sirag'],
      children: [
        { nam2e: 'Nour' },
        { name: 'Sirag', age: 26 },
        { name: 'Ali' }
      ]
    };

    const check = await ObjectCheck.for(input).notEmpty().noExtraFields().check(person => [
      person.required('name').string().minLength(5, { err: 'Name is too short' }),
      person.optional('name').string().maxLength(2, { err: 'Name is too long' }),
      person.optional('salary').number().greaterThan('tax', { err: 'Salary must be greater than tax' }),
      person.required('address').object().check(address => [
        address.required('street').string(),
        address.required('city').string()
      ]),
      person.optional('children').array().maxLength(10)
        .check_each(child => [
          child.object(),
          child.required('name').string(),
          child.optional('age').number().greaterThan(0).atMost(150)
        ]),
      person.optional('children').array()
        .is_true_each(child => {
          if (child.age !== undefined && child.age >= 18) {
            return false;
          }
          return true;
        }),
      person.is_true(data => {
        if ((data.child_count || 0) != (data.children?.length || 0)) return false;
        return true;
      }, { err: 'Child count should equal the number of children' }),
      person.is_true(async data => {
        if (!data.photo) return true;
        return false;
      }, { err: 'Photo must be at least 5KB' })
    ]);

    const result = check.result({ raw: true, nested: true, flattened: true }) as any;
    const children = result.raw.results.find((entry: any) => entry.field === 'children');

    expect(children.results.filter((entry: any) => entry.err === 'Field children[1]: Custom check failed')).toHaveLength(1);
    expect(result.errors.filter((entry: string) => entry === 'Field children[1]: Custom check failed')).toHaveLength(1);
  });
});