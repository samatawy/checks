import type { RootType } from "../types";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";

export interface TypesFileResult {
    read: number;
    passed: number;
    failed: number;
    types: RootType[];
    errors: string[];
}

/**
 * Options for configuring the behavior of the TypesFileReader when parsing types from a file.
 */
export interface TypesFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all types (including invalid ones) or only fully valid types.
     * - 'all': Accept all types, but include errors for any invalid types. The resulting types object will include only the successfully parsed types, and the errors array will contain messages for any types that failed to parse.
     * - 'partial': Only accept types if all of them are valid. If any type fails to parse, the entire parsing process will be considered a failure, and the resulting types object will be empty while the errors array will contain messages for all failed types.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing types files that define data structures for input (and output) properties.
 * You should use this class to read types from a text file, where each line (or block) defines a type 
 * as a JSON object with a "key" property and either: "type" or "properties" that define the type structure.
 * The reader will parse the file content and return an object containing the successfully parsed types as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, but blocks are the default and highly recommended.
 * It also includes error handling for invalid syntax and duplicate keys, ensuring that the resulting types object is valid and usable within the rule engine.
 */
export class TypesFileReader extends AbstractFileReader {

    protected options: Partial<TypesFileReaderOptions>;

    /**
     * Create a new instance of the TypesFileReader with the specified options for parsing types from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<TypesFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block'
        });

        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'partial',
            ...options
        };
    }

    /**
     * Parse the content of a types file and return the result, including the successfully parsed types and any errors encountered.
     * @param fileContent The content of the types file to parse.
     * @returns The result of parsing, including the successfully parsed types and any errors encountered.
     */
    public parse(fileContent: string): TypesFileResult {

        let read = 0, passed = 0, failed = 0, errors: string[] = [];
        try {
            let origin = fileContent.trim();
            let remainder = origin;
            const syntaxes: string[] = [];
            while (remainder.length > 0) {
                const { line, remainder: newRemainder } = this.options.read_by === 'block' ?
                    this.readBlock(remainder) :
                    this.readLine(remainder);

                if (line.length > 0) {
                    syntaxes.push(line);
                    read++;
                }
                remainder = newRemainder;
            }
            const attempts: (RootType | null)[] = syntaxes.map(syntax => {
                try {
                    return this.parseLine(syntax);
                } catch (e) {
                    errors.push(`Failed to parse type syntax: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
                    return null;
                }
            });
            if (attempts.includes(null) && this.options.accept === 'all') {
                return {
                    read,
                    passed: 0,
                    failed: read,
                    types: [],
                    errors
                };
            }
            // Prevent duplicates (and report them as errors) returning the types as an object with key-value pairs
            const parsed_types = attempts.filter(c => c !== null) as RootType[];
            let result: any = {};
            try {
                result = this.collectDistinct(parsed_types);
                return {
                    read,
                    passed: parsed_types.length,
                    failed: read - parsed_types.length,
                    types: result,
                    errors
                };

            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                return {
                    read,
                    passed: 0,
                    failed: read,
                    types: [],
                    errors
                };
            }

        } catch (error) {
            throw new Error(`Failed to parse types file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected parseLine(content: string): RootType {

        try {
            const json = JSON.parse(content);
            if (typeof json !== 'object' || json === null || Array.isArray(json)) {
                throw new Error(`Type definition must be a JSON object: ${content}`);
            }
            if (!json.hasOwnProperty('key')) {
                throw new Error(`Type definition must have a "key" property: ${content}`);
            }
            return json as RootType;

        } catch (e) {
            throw new Error(`Invalid type syntax: ${content}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    protected collectDistinct(array: RootType[]): RootType[] {
        const result: { [key: string]: RootType } = {};
        for (const item of array) {
            const key = item.key;
            if (result[key!] !== undefined) {
                throw new Error(`Duplicate type key found: ${key}`);
            }
            result[key!] = item;
        }
        return Object.values(result);
    }
}