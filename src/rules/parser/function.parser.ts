import type { Expression } from "../..";
import type { AtomicType, FunctionDefinition, NamedParameter, PropertyType } from "../types";
import { isAtomicType } from "../utils";
import { ExpressionParser } from "./expression.parser";
import type { ParserOptions } from "./rule.parser";

/**
 * Parser class for parsing function syntax into CustomFunctionExpression objects.
 * You should normally not need to use this parser directly, as it is primarily used internally when creating functions from syntax.
 * This parser handles parsing of custom functions with parameters and a body expression.
 * The parser uses regular expressions to identify the structure of the function syntax and delegates to the ExpressionParser 
 * for parsing specific components of the function (like the body expression). 
 * The parser is designed to be extensible, allowing for additional function types and syntax patterns to be added in the future as needed.
 */
export class FunctionParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
    }

    public parse(syntax: string): FunctionDefinition | null {

        let defined: FunctionDefinition | null = null;
        if (syntax.length === 0) {
            throw new Error('Function syntax cannot be empty');
        }

        // If this is in the form name(arg1, arg2) { expr } attempt parsing
        if (syntax.match(/\w+\(.*\)\s*{.*}/g)) {
            console.debug('Syntax passes initial match');
            defined = this.parseCustomFunction(syntax);
        } else {
            console.debug('Syntax does not pass initial match');
        }

        if (defined) {
            return defined;
        } else {
            throw new Error(`Unrecognized function syntax: ${syntax}`);
        }
    }

    protected parseCustomFunction(syntax: string): FunctionDefinition | null {
        syntax = syntax?.trim() || '';
        if (syntax.length === 0) {
            return null;
        }
        const match = syntax.match(/(\w+)\s*\((.*)\)\s*{(.*)}$/);
        if (match) {
            console.debug('Syntax matches function pattern, attempting to parse as function expression');

            const name = match[1]!;
            const paramsSyntax = match[2]!;
            const bodySyntax = match[3]!;
            const params = this.readParameters(paramsSyntax);
            const expression = this.parseBody(bodySyntax);
            return { name, parameters: params, expression };
            // return CustomFunctionExpression.from({ name, parameters: params, expression }, []);
        } else {
            console.debug('Syntax does not match function pattern, cannot parse as function expression');
        }
        throw new Error(`Syntax does not match CustomFunction pattern: ${syntax}`);
    }

    protected readParameters(syntax: string): NamedParameter[] {
        // Parse parameters if any are provided, otherwise return an empty array
        // Parameters are expected in the form "name: type, name2: type2, ..."
        const params: NamedParameter[] = [];
        const paramSyntaxes = syntax.split(',').map(s => s.trim()).filter(s => s.length > 0);
        for (const paramSyntax of paramSyntaxes) {
            const match = paramSyntax.match(/^(\w+)\s*:\s*(\w+)$/);
            if (match) {
                if (isAtomicType(match[2]! as PropertyType)) {
                    params.push({
                        name: match[1]!,
                        type: match[2]! as AtomicType,
                        optional: false
                    } as NamedParameter);
                } else {
                    throw new Error(`Invalid parameter type for parameter ${match[1]!}: ${match[2]!}`);
                }
            } else {
                throw new Error(`Parameter syntax does not match expected pattern "name: type": ${paramSyntax}`);
            }
        }
        return params;
    }

    protected parseBody(syntax: string): Expression {
        // Parse body in the form "return expression" or just "expression"
        if (syntax.trim().startsWith('return ')) {
            syntax = syntax.trim().substring(7).trim();
        }
        const expression = this.expressionParser.parse(syntax);
        if (!expression) {
            throw new Error(`Failed to parse body for CustomFunction: ${syntax}`);
        }
        return expression;
    }
}