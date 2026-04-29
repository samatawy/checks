import type { FunctionMemory } from "../engine/function.memory";
import type { WorkSpace } from "../engine/work.space";
import { OutputAction } from "../executable";
import type { AbstractRule } from "../rules/abstract.rule";
import { OutputRule, StateRule } from "../rules/assignment.rules";
import { IfThenElseRule, IfThenRule, IfThrowRule } from "../rules/conditional.rules";
import { ExecutableParser } from "./executable.parser";
import { ExpressionParser } from "./expression.parser";

export interface RuleMetadata {
    name?: string;
    description?: string;
    salience?: number;
    syntax?: string;
}

export interface ParserOptions {
    workspace?: WorkSpace;
}

/**
 * Parser class for parsing rule syntax into AbstractRule objects.
 * You should normally not need to use this parser directly, as it is primarily used internally when creating rules from syntax.
 * This parser handles parsing of conditional rules (IF-THEN, IF-THEN-ELSE, IF-THROW) as well as assignment rules (SET x = value).
 * It also supports parsing of metadata annotations for rules, such as @name, @description, and @salience.
 * The parser uses regular expressions to identify the structure of the rule syntax and delegates to the ExpressionParser and ExecutableParser 
 * for parsing specific components of the rules (like conditions and consequences). 
 * The parser is designed to be extensible, allowing for additional rule types and syntax patterns to be added in the future as needed.
 */
export class RuleParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    private executableParser: ExecutableParser;

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
        this.executableParser = new ExecutableParser(this.options);
    }

    public parse(syntax: string): AbstractRule | null {

        const metadata = this.parseMetadata({ syntax });
        let parsed: AbstractRule | null = null;
        syntax = metadata.syntax || '';
        if (syntax.length === 0) {
            throw new Error('Rule syntax cannot be empty');
        }

        // If this is a conditional rule, like "IF condition THEN consequence [ELSE alternative]"
        // or "IF condition THROW errorMessage"
        if (syntax.match(/^IF\s+/i)) {
            parsed = this.parseConditionalRule(syntax);
        }

        // If this is a conditional assignment rule like "SET x = 5 IF condition"
        if (syntax.match(/^SET\s+\w+\s*=\s*.+\s+IF\s+/i)) {
            parsed = this.parseStateIfRule(syntax);
        }

        // If this is a default assignment rule, like "SET x = 10"
        if (syntax.match(/^SET\s+/i)) {
            parsed = this.parseStateRule(syntax);
        }

        if (parsed) {
            parsed.name = metadata.name;
            parsed.description = metadata.description;
            parsed.setSalience(metadata.salience ?? 0);
            return parsed;
        } else {
            throw new Error(`Unrecognized rule syntax: ${syntax}`);
        }
    }

    protected parseMetadata(given: RuleMetadata): RuleMetadata {
        given.syntax = given.syntax?.trim() || '';
        if (given.syntax.length === 0 || !(given.syntax.startsWith('@'))) {
            return given;
        }

        if (given.syntax.startsWith('@name(')) {
            const match = given.syntax.match(/^@name\((.+?)\)\s*(.*)$/);
            if (match) {
                given.name = match[1]!;
                given.syntax = match[2]!;
            }
        } else if (given.syntax.startsWith('@description(')) {
            const match = given.syntax.match(/^@description\((.+?)\)\s*(.*)$/);
            if (match) {
                given.description = match[1]!;
                given.syntax = match[2]!;
            }
        } else if (given.syntax.startsWith('@salience(')) {
            const match = given.syntax.match(/^@salience\((\d+)\)\s*(.*)$/);
            if (match) {
                given.salience = parseInt(match[1]!, 10);
                given.syntax = match[2]!;
            }
        }

        return this.parseMetadata(given);
    }

    protected parseConditionalRule(syntax: string): AbstractRule | null {
        let rule = this.parseIfThenElseRule(syntax);
        if (rule) {
            return rule;
        }
        rule = this.parseIfThenRule(syntax);
        if (rule) {
            return rule;
        }
        rule = this.parseIfThrowRule(syntax);
        if (rule) {
            return rule;
        }
        return null;
    }

    protected parseIfThenRule(syntax: string): AbstractRule | null {

        // split syntax allowing nested variables names in the left side 
        // and allowing any executable action in the right side
        const match = syntax.match(/^IF\s+(.+?)\s+THEN\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new Error(`Failed to parse condition for IfThenRule: ${conditionSyntax}`);
            }

            const consequenceSyntax = match[2]!;
            const consequence = this.executableParser.parse(consequenceSyntax);
            if (!consequence) {
                throw new Error(`Failed to parse consequence for IfThenRule: ${consequenceSyntax}`);
            }
            return IfThenRule.parsed(syntax, condition, consequence);
        }
        throw new Error(`Syntax does not match IfThenRule pattern: ${syntax}`);
    }

    protected parseIfThenElseRule(syntax: string): AbstractRule | null {

        const match = syntax.match(/^IF\s+(.+?)\s+THEN\s+(.+?)\s+ELSE\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new Error(`Failed to parse condition for IfThenElseRule: ${conditionSyntax}`);
            }
            const consequenceSyntax = match[2]!;
            const consequence = this.executableParser.parse(consequenceSyntax);
            if (!consequence) {
                throw new Error(`Failed to parse consequence for IfThenElseRule: ${consequenceSyntax}`);
            }
            const alternativeSyntax = match[3]!;
            const alternative = this.executableParser.parse(alternativeSyntax);
            if (!alternative) {
                throw new Error(`Failed to parse alternative for IfThenElseRule: ${alternativeSyntax}`);
            }

            return IfThenElseRule.parsed(syntax, condition, consequence, alternative); // For simplicity, we're not implementing the consequence execution here
        }
        return null;
    }

    protected parseIfThrowRule(syntax: string): AbstractRule | null {

        // Both if x throw e and if x then throw e are supported
        // The keyword 'THEN' is optional
        const match = syntax.match(/^IF\s+(.+?)\s+(?:THEN\s+)?THROW\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new Error(`Failed to parse condition for IfThrowRule: ${conditionSyntax}`);
            }
            const errorMessage = match[2]!;

            return IfThrowRule.parsed(syntax, condition, errorMessage);
        }
        return null;
    }

    protected parseStateRule(syntax: string): AbstractRule | null {
        // This is a placeholder for parsing assignment rules like "SET x = 10"

        const match = syntax.match(/^SET\s+(\w+)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[2]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);
            if (!valueExpr) {
                throw new Error(`Failed to parse value expression for StateRule: ${valueSyntax}`);
            }

            return OutputRule.parsed(syntax, variableName, valueExpr); // You would need to implement this class
        }
        return null;
    }

    protected parseStateIfRule(syntax: string): AbstractRule | null {
        // Parsing conditional assignment rules like "SET x = 5 IF condition"

        const match = syntax.match(/^SET\s+(\w+)\s*=\s*(.+)\s+IF\s+(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[2]!;
            const conditionSyntax = match[3]!;

            const valueExpr = this.expressionParser.parse(valueSyntax);
            if (!valueExpr) {
                throw new Error(`Failed to parse value expression for StateIfRule: ${valueSyntax}`);
            }

            const conditionExpr = this.expressionParser.parse(conditionSyntax);
            if (!conditionExpr) {
                throw new Error(`Failed to parse condition expression for StateIfRule: ${conditionSyntax}`);
            }

            return IfThenRule.parsed(syntax, conditionExpr, new OutputAction(variableName, valueExpr));
            // return new IfThenRule(syntax, conditionExpr, new StateRule(syntax, variableName, valueExpr));
        }
        return null;
    }
}