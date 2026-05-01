import { ArithmeticExpression } from "../syntax/arithmetic.expression";
import { ComparisonExpression } from "../syntax/comparison.expression";
import type { Expression } from "../syntax/expression";
import { FunctionFactory } from "./function.factory";
import { LiteralExpression } from "../syntax/literal.expression";
import { LogicalExpression } from "../syntax/logical.expression";
import { TernaryExpression } from "../syntax/ternary.expression";
import { VariableExpression } from "../syntax/variable.expression";
import type { ParserOptions, WorkSpace } from "../..";
import { LambdaExpression } from "../syntax/lambda.expression";

/**
 * Parser class for parsing expressions from rule syntax.
 * You should normally not need to use this parser directly, as it is primarily used internally 
 * by the RuleParser and ExecutableParser when parsing conditions and consequences from rule syntax.
 * This parser handles parsing of literals, variables, function calls, logical expressions (AND/OR), 
 * comparison expressions (==, !=, <, >, <=, >=), arithmetic expressions (+, -, *, /, %), 
 * and ternary expressions (condition ? trueExpr : falseExpr).
 * It uses a recursive descent parsing approach, starting with the most complex expressions (function calls, logical expressions) 
 * and working down to simpler expressions (literals, variables).
 * The parser also handles operator precedence by first parsing lower-precedence operators (like + and -) 
 * before higher-precedence operators (like * and /).    
 */
export class ExpressionParser {

    private options: ParserOptions;

    constructor(options: ParserOptions) {
        this.options = options;
    }

    /**
     * Parse a string expression into an Expression object that can be evaluated within the rule engine.
     * @param syntax The string representation of the expression to parse.
     * @returns An Expression object representing the parsed expression if successful.
     * @throws An error if the expression is empty or invalid.
     */
    public parse(syntax: string): Expression {
        if (!syntax || syntax.trim() === '') {
            throw new Error("Empty expression");
        }

        // insert spaces around parentheses and operators to ensure they are treated as separate tokens
        syntax = syntax.replace(/([()?:%*/+-])/g, ' $1 ');
        // collapse multiple spaces into a single space
        syntax = syntax.replace(/\s+/g, ' ').trim();

        // split by spaces using simple regex
        const tokens = syntax.split(/\s+/);
        if (tokens.length === 0) {
            throw new Error("Empty expression");
        }
        // console.debug(`Tokens: ${JSON.stringify(tokens)}`);

        // console.debug(`Parsing expression: ${syntax}`);

        if (this.isEnclosedInParentheses(syntax)) {
            // console.debug(`Expression is enclosed in parentheses, stripping and parsing inner expression: ${syntax}`);
            const innerSyntax = this.stripEnclosingParentheses(syntax);
            return this.parse(innerSyntax);
        }

        const lambdaExpr = this.readLambdaExpression(tokens);
        if (lambdaExpr) {
            return lambdaExpr;
        }

        const functionExpr = this.readFunctionExpression(tokens);
        if (functionExpr) {
            // console.debug(`Parsed function expression: ${syntax}`);
            return functionExpr;
        }

        const logicalExpr = this.readLogicalExpression(tokens);
        if (logicalExpr) {
            // console.debug(`Parsed logical expression: ${syntax}`);
            return logicalExpr;
        }

        const ternaryExpr = this.readTernaryExpression(tokens);
        if (ternaryExpr) {
            // console.debug(`Parsed ternary expression: ${syntax}`);
            return ternaryExpr;
        }

        const comparisonExpr = this.readComparisonExpression(tokens);
        if (comparisonExpr) {
            // console.debug(`Parsed comparison expression: ${syntax}`);
            return comparisonExpr;
        }

        const arithmeticExpr = this.readArithmeticExpression(['+', '-'], tokens);
        if (arithmeticExpr) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr;
        }

        const arithmeticExpr2 = this.readArithmeticExpression(['*', '/'], tokens);
        if (arithmeticExpr2) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr2;
        }

        const arithmeticExpr3 = this.readArithmeticExpression(['%'], tokens);
        if (arithmeticExpr3) {
            // console.debug(`Parsed arithmetic expression: ${syntax}`);
            return arithmeticExpr3;
        }

        const literalExpr = this.readLiteralExpression(syntax);
        if (literalExpr) {
            // console.debug(`Parsed literal expression: ${syntax}`);
            return literalExpr;
        }

        const variableExpr = this.readVariableExpression(syntax);
        if (variableExpr) {
            // console.debug(`Parsed variable expression: ${syntax}`);
            return variableExpr;
        }

        throw new Error(`Unable to parse expression: ${syntax}`);
    }

    protected isEnclosedInParentheses(syntax: string): boolean {
        if (syntax.length < 2 || syntax[0] !== '(' || syntax[syntax.length - 1] !== ')') {
            return false;
        }

        let parenthesesCount = 0;
        for (let i = 0; i < syntax.length; i++) {
            if (syntax[i] === '(') {
                parenthesesCount++;
            } else if (syntax[i] === ')') {
                parenthesesCount--;
                if (parenthesesCount === 0 && i !== syntax.length - 1) {
                    return false;
                }
            }
        }

        return parenthesesCount === 0;
    }

    protected stripEnclosingParentheses(syntax: string): string {
        if (this.isEnclosedInParentheses(syntax)) {
            return syntax.slice(1, -1);
        }
        return syntax;
    }

    protected readFunctionExpression(tokens: string[]): Expression | null {

        if (tokens.length >= 2 && tokens[1] === '(' && tokens[tokens.length - 1] === ')') {
            if (!this.isEnclosedInParentheses(tokens.slice(1).join(' '))) {
                // unbalanced parentheses in function arguments, not a valid function expression
                return null;
            }

            const functionName = tokens[0]!;
            const argsSyntax = tokens.slice(2, -1).join(' ');
            const args = this.splitArguments(argsSyntax);
            const argExpressions = args.map(arg => this.parse(arg));
            return new FunctionFactory(this.options).create(functionName, argExpressions);
        }
        return null;
    }

    protected splitArguments(argsSyntax: string): string[] {
        const args: string[] = [];
        let currentArg = '';
        let parenthesesCount = 0;

        for (let i = 0; i < argsSyntax.length; i++) {
            const char = argsSyntax[i]!;
            if (char === ',' && parenthesesCount === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                if (char === '(') {
                    parenthesesCount++;
                } else if (char === ')') {
                    parenthesesCount--;
                }
                currentArg += char;
            }
        }

        if (currentArg.trim() !== '') {
            args.push(currentArg.trim());
        }

        return args;
    }

    protected readLogicalExpression(tokens: string[]): LogicalExpression | null {
        let operatorIndex = -1;
        let operator = null;
        let parenthesesCount = 0;

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === '(') {
                parenthesesCount++;
            } else if (tokens[i] === ')') {
                parenthesesCount--;
            } else if (parenthesesCount === 0 && (tokens[i] === 'AND' || tokens[i] === 'OR' || tokens[i] === '&&' || tokens[i] === '||')) {
                operatorIndex = i;
                operator = tokens[i];
                break;
            }
        }

        if (operator && operatorIndex !== -1) {
            const leftSyntax = tokens.slice(0, operatorIndex).join(' ');
            const rightSyntax = tokens.slice(operatorIndex + 1).join(' ');
            const leftExpr = this.parse(leftSyntax);
            const rightExpr = this.parse(rightSyntax);
            return new LogicalExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    protected readTernaryExpression(tokens: string[]): TernaryExpression | null {
        let questionMarkIndex = -1;
        let colonIndex = -1;
        let parenthesesCount = 0;

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === '(') {
                parenthesesCount++;
            } else if (tokens[i] === ')') {
                parenthesesCount--;
            } else if (parenthesesCount === 0) {
                if (tokens[i] === '?') {
                    questionMarkIndex = i;
                } else if (tokens[i] === ':') {
                    colonIndex = i;
                    break;
                }
            }
        }

        if (questionMarkIndex !== -1 && colonIndex !== -1 && questionMarkIndex < colonIndex) {
            const conditionSyntax = tokens.slice(0, questionMarkIndex).join(' ');
            const trueSyntax = tokens.slice(questionMarkIndex + 1, colonIndex).join(' ');
            const falseSyntax = tokens.slice(colonIndex + 1).join(' ');
            const conditionExpr = this.parse(conditionSyntax);
            const trueExpr = this.parse(trueSyntax);
            const falseExpr = this.parse(falseSyntax);
            return new TernaryExpression(conditionExpr, trueExpr, falseExpr);
        }
        return null;
    }

    protected readLambdaExpression(tokens: string[]): LambdaExpression | null {
        let colonIndex = -1;
        let parenthesesCount = 0;

        const match = tokens.join(' ').match(/^(\w+)\s*:\s*(.*)$/);
        if (match) {
            const variableSyntax = match[1]!;
            const expressionSyntax = match[2]!;
            const expression = this.parse(expressionSyntax);
            return new LambdaExpression(variableSyntax, expression);
        }

        // for (let i = 0; i < tokens.length; i++) {
        //     if (tokens[i] === '(') {
        //         parenthesesCount++;
        //     } else if (tokens[i] === ')') {
        //         parenthesesCount--;
        //     } else if (parenthesesCount === 0) {
        //         if (tokens[i] === ':') {
        //             colonIndex = i;
        //             break;
        //         }
        //     }
        // }

        // if (colonIndex !== -1) {
        //     const variableSyntax = tokens.slice(0, colonIndex).join(' ');
        //     const expressionSyntax = tokens.slice(colonIndex + 1).join(' ');
        //     const expression = this.parse(expressionSyntax);
        //     return new LambdaExpression(variableSyntax, expression);
        // }
        return null;
    }

    protected readComparisonExpression(tokens: string[]): ComparisonExpression | null {
        let operatorIndex = -1;
        let operator = null;
        let parenthesesCount = 0;

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === '(') {
                parenthesesCount++;
            } else if (tokens[i] === ')') {
                parenthesesCount--;
            } else if (parenthesesCount === 0 && (tokens[i] === '==' || tokens[i] === '!=' || tokens[i] === '<' || tokens[i] === '>' || tokens[i] === '<=' || tokens[i] === '>=')) {
                operatorIndex = i;
                operator = tokens[i];
                break;
            }
        }

        if (operator && operatorIndex !== -1) {
            const leftSyntax = tokens.slice(0, operatorIndex).join(' ');
            const rightSyntax = tokens.slice(operatorIndex + 1).join(' ');
            const leftExpr = this.parse(leftSyntax);
            const rightExpr = this.parse(rightSyntax);
            return new ComparisonExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    public readArithmeticExpression(operators: string[], tokens: string[]): ArithmeticExpression | null {
        let operatorIndex = -1;
        let operator = null;
        let parenthesesCount = 0;

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === '(') {
                parenthesesCount++;
            } else if (tokens[i] === ')') {
                parenthesesCount--;
            } else if (parenthesesCount === 0 && operators.includes(tokens[i]!)) {
                operatorIndex = i;
                operator = tokens[i];
                break;
            }
        }

        if (operator && operatorIndex !== -1) {
            const leftSyntax = tokens.slice(0, operatorIndex).join(' ');
            const rightSyntax = tokens.slice(operatorIndex + 1).join(' ');
            const leftExpr = this.parse(leftSyntax);
            const rightExpr = this.parse(rightSyntax);
            return new ArithmeticExpression(operator, leftExpr, rightExpr);
        }
        return null;
    }

    protected readLiteralExpression(syntax: string): LiteralExpression | null {
        // match numbers (integer and floating point), booleans, null, and quoted strings
        if (/^\d+(\.\d+)?$/.test(syntax)) {
            return new LiteralExpression(parseFloat(syntax));
        } else if (/^true$/i.test(syntax)) {
            return new LiteralExpression(true);
        } else if (/^false$/i.test(syntax)) {
            return new LiteralExpression(false);
        } else if (/^null$/i.test(syntax)) {
            return new LiteralExpression(null);
        } else if (/^".*"$/.test(syntax) || /^'.*'$/.test(syntax)) {
            return new LiteralExpression(syntax.slice(1, -1));
        }
        return null;
    }

    protected readVariableExpression(syntax: string): VariableExpression | null {
        // match alphanumeric strings that may include separating dots for nested variables, but do not start with a digit
        if (/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(syntax)) {
            return new VariableExpression(syntax);
        }
        return null;
    }

}