import { AbstractRule } from "./abstract.rule";
import type { Expression } from "../syntax/expression";
import type { RuleContext } from "../types";
import { RuleParser } from "../parser/rule.parser";

export class OutputRule extends AbstractRule {

    protected outputKey: string;

    protected expression: Expression;

    constructor(syntax: string, key: string, expression: Expression | null) {
        super(syntax);
        this.outputKey = key;
        if (expression) {
            this.expression = expression;
        }
        else {
            const parsed = new RuleParser().parse(syntax);
            if (parsed instanceof OutputRule && parsed.expression) {
                this.outputKey = parsed.outputKey;
                this.expression = parsed.expression;
            } else {
                throw new Error(`Invalid syntax for OutputRule: ${syntax}`);
            }
        }
        this.require(...this.expression.required());
    }

    public toString(): string {
        return `SET ${this.outputKey} = ${this.expression.toString()}`;
    }

    public evaluate(context: RuleContext): boolean {
        const value = this.expression.evaluate(context);
        context.setOutput(this.outputKey, value);
        return true;
    }
}

export const StateRule = OutputRule;