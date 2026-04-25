import type { AbstractRule } from "../rules/abstract.rule";
import { StateRule } from "../rules/assignment.rules";
import { IfThenElseRule, IfThenRule } from "../rules/conditional.rules";
import { ExecutableParser } from "./executable.parser";
import { ExpressionParser } from "./expression.parser";

export class RuleParser {
    private expressionParser: ExpressionParser;
    private executableParser: ExecutableParser;

    constructor() {
        this.expressionParser = new ExpressionParser();
        this.executableParser = new ExecutableParser();
    }

    public parse(syntax: string): AbstractRule | null {

        // If this is a conditional rule, parse it as such
        if (syntax.match(/^IF\s+/i)) {
            return this.parseConditionalRule(syntax);
        }

        // If this is an assignment rule, parse it as such
        if (syntax.match(/^SET\s+/i)) {
            return this.parseStateRule(syntax);
        }
        throw new Error(`Unrecognized rule syntax: ${syntax}`);
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
            return new IfThenRule(syntax, condition, consequence);
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

            return new IfThenElseRule(syntax, condition, consequence, alternative); // For simplicity, we're not implementing the consequence execution here
        }
        return null;
    }

    protected parseIfThrowRule(syntax: string): AbstractRule | null {

        const match = syntax.match(/^IF\s+(.+?)\s+THEN\s+THROW\s+(.+)$/i);
        if (match) {
            const conditionSyntax = match[1]!;
            const condition = this.expressionParser.parse(conditionSyntax);
            if (!condition) {
                throw new Error(`Failed to parse condition for IfThrowRule: ${conditionSyntax}`);
            }
            const errorMessage = match[2]!;

            return new IfThenElseRule(syntax, condition, null as any, null as any); // For simplicity, we're not implementing the consequence execution here
        }
        return null;
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

            return new StateRule(syntax, variableName, valueExpr); // You would need to implement this class
        }
        return null;
    }
}