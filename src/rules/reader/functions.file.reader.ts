import { FunctionParser } from "../parser/function.parser";
import type { FunctionDefinition } from "../types";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";

export interface FunctionsFileResult {
    read: number;
    passed: number;
    failed: number;
    functions: Record<string, FunctionDefinition>;
    errors: string[];
}

/**
 * Options for configuring the behavior of the FunctionsFileReader when parsing functions from a file.
 */
export interface FunctionsFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all functions (including invalid ones) or only fully valid functions.
     * - 'all': Accept all functions, but include errors for any invalid functions. The resulting functions object will include only the successfully parsed functions, and the errors array will contain messages for any functions that failed to parse.
     * - 'partial': Only accept functions if all of them are valid. If any function fails to parse, the entire parsing process will be considered a failure, and the resulting functions object will be empty while the errors array will contain messages for all failed functions.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing functions files that define key-value pairs of functions to be used within the rule engine.
 * You should use this class to read functions from a text file, where each line (or block) defines a function in the format "function NAME(PARAMS) { BODY }".
 * The reader will parse the file content and return an object containing the successfully parsed functions as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, allowing for flexible formatting of the functions file.
 * It also includes error handling for invalid syntax and duplicate function names, ensuring that the resulting functions object is valid and usable within the rule engine.
 */
export class FunctionsFileReader extends AbstractFileReader {

    protected options: Partial<FunctionsFileReaderOptions>;

    functionParser: FunctionParser;

    /**
     * Create a new instance of the FunctionsFileReader with the specified options for parsing functions from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<FunctionsFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block'
        });
        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'partial',
            ...options
        };
        // console.debug(this.options);
        this.functionParser = new FunctionParser({ workspace: options?.workspace });
    }

    /**
     * Parse the content of a functions file and return the result, including the successfully parsed functions and any errors encountered during parsing.
     * @param fileContent The content of the functions file to parse.
     * @returns The result of parsing, including the successfully parsed functions and any errors encountered.
     */
    public parse(fileContent: string): FunctionsFileResult {

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
            const attempts: (FunctionDefinition | null)[] = syntaxes.map(syntax => {
                try {
                    return this.parseLine(syntax);
                } catch (e) {
                    if (e instanceof Error) {
                        errors.push(e.message);
                    } else if (e !== null && e !== undefined) {
                        errors.push(String(e));
                    } else {
                        errors.push(`Failed to parse function syntax: ${syntax}.`);
                    }
                    return null;
                }
            });
            if (attempts.includes(null) && this.options.accept === 'all') {
                return {
                    read,
                    passed: 0,
                    failed: read,
                    functions: {},
                    errors
                };
            }
            // console.debug('Parsed functions attempts:', attempts);
            // Prevent duplicates (and report them as errors) returning the functions as an object with key-value pairs
            const defined_functions = attempts.filter(c => c !== null) as FunctionDefinition[];
            let result: Record<string, FunctionDefinition> = {};
            try {
                result = this.collectDistinct(defined_functions);
                return {
                    read,
                    passed: defined_functions.length,
                    failed: read - defined_functions.length,
                    functions: result,
                    errors
                };

            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                return {
                    read,
                    passed: 0,
                    failed: read,
                    functions: {},
                    errors
                };
            }

        } catch (error) {
            throw new Error(`Failed to parse functions file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected parseLine(content: string): FunctionDefinition | null {
        // Parse a line defining a function, expected in the format "name(arg1: type, arg2: type) { body }"
        try {
            return this.functionParser.parse(content);
        } catch (e) {
            if (e instanceof Error) {
                throw new Error(e.message);
            } else if (e !== null && e !== undefined) {
                throw new Error(String(e));
            } else {
                throw new Error(`Invalid function syntax: ${content}.`);
            }
        }
    }

    protected collectDistinct(array: FunctionDefinition[]): any {
        const result: any = {};
        for (const item of array) {
            const key = item.name;
            if (result[key!] !== undefined) {
                throw new Error(`Duplicate function key found: ${key}`);
            }
            result[key!] = item;
        }
        return result;
    }
}