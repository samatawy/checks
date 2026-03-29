import type { SchemaRoot } from './types';

export const personSchema: SchemaRoot = {
  $schema: 'https://samatawy.dev/checks.schema.json',
  schema: {
    type: 'object',
    notEmpty: {
      warn: 'Empty payloads are unusual'
    },
    properties: {
      name: {
        type: 'string',
        required: {
          err: 'Name is required'
        },
        minLength: {
          value: 2,
          hint: 'Two or more characters gives better results'
        },
        maxLength: {
          value: 100,
          err: 'Name must be 100 characters or fewer'
        }
      },
      age: {
        type: 'number',
        atLeast: {
          value: 18,
          warn: 'Age under 18 requires parental review'
        }
      },
      child_count: {
        type: 'number'
      },
      children: {
        type: 'array',
        maxLength: 10,
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true,
              minLength: 1
            },
            age: {
              type: 'number',
              atMost: {
                value: 17,
                warn: 'Children older than 17 need manual review'
              }
            }
          }
        }
      },
      photo: {
        type: 'image',
        mimeType: {
          value: 'image/*',
          err: 'Photo must be an image'
        },
        minWidth: {
          value: 200,
          hint: 'Larger images display better'
        }
      }
    },
    rules: [
      {
        use: 'child_count_matches_children',
        warn: 'child_count should equal the number of children'
      }
    ]
  }
};
