import type { WorkSpace } from "../..";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";

export interface ConstantsFileResult {
    read: number;
    passed: number;
    failed: number;
    constants: Record<string, any>;
    errors: string[];
}

/**
 * Options for configuring the behavior of the ConstantsFileReader when parsing constants from a file.
 */
export interface ConstantsFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all constants (including invalid ones) or only fully valid constants.
     * - 'all': Accept all constants, but include errors for any invalid constants. The resulting constants object will include only the successfully parsed constants, and the errors array will contain messages for any constants that failed to parse.
     * - 'partial': Only accept constants if all of them are valid. If any constant fails to parse, the entire parsing process will be considered a failure, and the resulting constants object will be empty while the errors array will contain messages for all failed constants.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing constants files that define key-value pairs of constants to be used within the rule engine.
 * You should use this class to read constants from a text file, where each line (or block) defines a constant in the format "CONST KEY = VALUE" or "KEY = VALUE".
 * The reader will parse the file content and return an object containing the successfully parsed constants as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, allowing for flexible formatting of the constants file.
 * It also includes error handling for invalid syntax and duplicate keys, ensuring that the resulting constants object is valid and usable within the rule engine.
 */
export class ConstantsFileReader extends AbstractFileReader {

    protected options: Partial<ConstantsFileReaderOptions>;

    /**
     * Create a new instance of the ConstantsFileReader with the specified options for parsing constants from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<ConstantsFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'line'
        });
        this.options = {
            read_by: options?.read_by || 'line',
            accept: options?.accept || 'partial',
            ...options
        }
    }

    /**
     * Parse the content of a constants file and return the result, including the successfully parsed constants and any errors encountered during parsing.
     * @param fileContent The content of the constants file to parse.
     * @returns The result of parsing, including the successfully parsed constants and any errors encountered.
     */
    public parse(fileContent: string): ConstantsFileResult {

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
            const attempts: (Record<string, any> | null)[] = syntaxes.map(syntax => {
                try {
                    return this.parseLine(syntax);
                } catch (e) {
                    errors.push(`Failed to parse constant syntax: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
                    return null;
                }
            });
            if (attempts.includes(null) && this.options.accept === 'all') {
                return {
                    read,
                    passed: 0,
                    failed: read,
                    constants: {},
                    errors
                };
            }
            // Prevent duplicates (and report them as errors) returning the constants as an object with key-value pairs
            const parsed_constants = attempts.filter(c => c !== null) as Record<string, any>[];
            let result: any = {};
            try {
                result = this.collectDistinct(parsed_constants);
                return {
                    read,
                    passed: parsed_constants.length,
                    failed: read - parsed_constants.length,
                    constants: result,
                    errors
                };

            } catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                return {
                    read,
                    passed: 0,
                    failed: read,
                    constants: {},
                    errors
                };
            }

        } catch (error) {
            throw new Error(`Failed to parse constants file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    protected parseLine(content: string): Record<string, any> {
        // Parse a line assigning a key to a value, e.g. CONST YEAR = 365 or YEAR= 365 (with or without the CONST keyword)
        const match = /^\s*(?:CONST\s+)?(\w+)\s*=\s*(.+)$/i.exec(content);
        if (match) {
            const key = match[1];
            const value = match[2];
            return { ['' + key]: value };
        } else {
            throw new Error(`Invalid constant syntax: ${content}`);
        }
    }

    protected collectDistinct(array: Record<string, any>[]): any {
        const result: any = {};
        for (const item of array) {
            const key = Object.keys(item)[0];
            if (result[key!] !== undefined) {
                throw new Error(`Duplicate constant key found: ${key}`);
            }
            result[key!] = item[key!];
        }
        return result;
    }
}