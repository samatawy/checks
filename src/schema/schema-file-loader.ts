import { readFile } from 'node:fs/promises';

import { SchemaCheck } from '.';
import type { JsonSchema } from '.';

export async function loadJsonSchemaFromFile(filePath: string): Promise<JsonSchema> {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as JsonSchema;
}

export async function loadSchemaCheckFromFile(filePath: string): Promise<SchemaCheck> {
    const schema = await loadJsonSchemaFromFile(filePath);
    return SchemaCheck.from(schema);
}