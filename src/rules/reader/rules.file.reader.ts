import type { AbstractRule } from "../rules/abstract.rule";
import { RuleParser } from "../parser/rule.parser";
import { AbstractFileReader, type FileReaderOptions } from "./abstract.file.reader";
import type { WorkSpace } from "../..";

export interface RulesFileResult {
    read: number;
    passed: number;
    failed: number;
    rules: AbstractRule[];
    errors: string[];
}

/**
 * Options for configuring the behavior of the RulesFileReader when parsing rules from a file.
 */
export interface RulesFileReaderOptions extends FileReaderOptions {
    /**
     * Determines whether to accept all rules (including invalid ones) or only fully valid rules.
     * - 'all': Accept all rules, but include errors for any invalid rules. The resulting rules array will include only the successfully parsed rules, and the errors array will contain messages for any rules that failed to parse.
     * - 'partial': Only accept rules if all of them are valid. If any rule fails to parse, the entire parsing process will be considered a failure, and the resulting rules array will be empty while the errors array will contain messages for all failed rules.
     */
    accept: 'all' | 'partial';
};

/**
 * Reader class for parsing rules files that contain rule definitions in text format.
 * You should use this class to read rules from a text file, where each line (or block) defines a rule in the expected syntax (e.g. "IF condition THEN consequence").
 * The reader will parse the file content and return an object containing the successfully parsed rules as well as any errors encountered during parsing.
 * The reader supports both line-by-line and block-by-block reading, allowing for flexible formatting of the rules file.
 * It also includes error handling for invalid syntax, ensuring that the resulting rules array only contains valid AbstractRule instances that can be used within the rule engine.
 */
export class RulesFileReader extends AbstractFileReader {

    protected ruleParser: RuleParser;
    protected options: Partial<RulesFileReaderOptions>;

    /**
     * Create a new instance of the RulesFileReader with the specified options for parsing rules from a file.
     * @param options Optional configuration for the reader.
     */
    constructor(options?: Partial<RulesFileReaderOptions>) {
        super({
            read_by: options?.read_by || 'block'
        });
        this.ruleParser = new RuleParser({ workspace: options?.workspace });
        this.options = {
            read_by: options?.read_by || 'block',
            accept: options?.accept || 'partial',
            ...options
        }
    }

    /**
     * Parse the content of a rules file and return the result, including the successfully parsed rules and any errors encountered.
     * @param fileContent The content of the rules file to parse.
     * @returns The result of parsing, including the successfully parsed rules and any errors encountered.
     */
    public parse(fileContent: string): RulesFileResult {

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
            const attempts: (AbstractRule | null)[] = syntaxes.map(syntax => {
                try {
                    return this.ruleParser.parse(syntax);
                } catch (e) {
                    errors.push(`Failed to parse rule syntax: ${syntax}. Error: ${e instanceof Error ? e.message : String(e)}`);
                    return null;
                }
            });
            if (attempts.includes(null) && this.options.accept === 'all') {
                return {
                    read,
                    passed: 0,
                    failed: read,
                    rules: [],
                    errors
                };
            }
            const parsed_rules = attempts.filter(rule => rule !== null);
            return {
                read,
                passed: parsed_rules.length,
                failed: read - parsed_rules.length,
                rules: parsed_rules as AbstractRule[],
                errors
            };

        } catch (error) {
            throw new Error(`Failed to parse rules file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}