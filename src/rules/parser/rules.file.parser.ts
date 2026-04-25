import type { AbstractRule } from "../rules/abstract.rule";
import { RuleParser } from "./rule.parser";

export interface RulesFileResult {
    read: number;
    passed: number;
    failed: number;
    rules: AbstractRule[];
    errors: string[];
}

export type RulesFileParserOptions = {
    accept: 'all' | 'partial';
    read_by: 'line' | 'block';
};

export class RulesFileParser {

    protected ruleParser: RuleParser;
    protected options: Partial<RulesFileParserOptions>;

    constructor(options?: Partial<RulesFileParserOptions>) {
        this.ruleParser = new RuleParser();
        this.options = options || {};
    }

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

    protected readLine(content: string): { line: string, remainder: string } {
        const newlineIndex = content.indexOf('\n');
        if (newlineIndex === -1) {
            return { line: content, remainder: '' };
        }
        const line = content.slice(0, newlineIndex).trim();
        const remainder = content.slice(newlineIndex + 1).trim();
        if (line.length === 0) {
            return this.readLine(remainder);
        } else {
            return { line, remainder };
        }
    }

    protected readBlock(content: string): { line: string, remainder: string } {
        // Normalize line endings to \n for consistent processing
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Find the first occurrence of an empty line (allowing whitespace)
        // This regex matches: \n + any whitespace + \n
        const match = /\n\s*\n/.exec(normalizedContent);

        if (match === null) {
            // No empty line found - return entire content as the block
            const line = normalizedContent.trim().replace(/\n/g, ' ');
            return { line, remainder: '' };
        }

        const blockEndIndex = match.index;
        const line = normalizedContent.slice(0, blockEndIndex).trim().replace(/\n/g, ' ');
        const remainder = normalizedContent.slice(match.index + match[0].length).trim();

        // Skip empty blocks (recursively)
        if (line.length === 0) {
            return this.readBlock(remainder);
        } else {
            return { line, remainder };
        }
    }
}