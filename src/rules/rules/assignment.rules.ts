import { AbstractRule } from "./abstract.rule";
import type { Expression } from "../syntax/expression";
import type { Executor, WorkingContext, RuleEffect } from "../types";
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
        this.willChange(this.outputKey);
    }

    public toString(): string {
        return `SET ${this.outputKey} = ${this.expression.toString()}`;
    }

    public evaluate(context: WorkingContext): Executor | null {
        const oldValue = context.getOutput(this.outputKey);
        const newValue = this.expression.evaluate(context);

        if (oldValue === newValue) {
            return null;
        } else {
            return {
                changes: () => new Set(this.outputKey),

                execute: (ctx: WorkingContext): RuleEffect => {
                    ctx.setOutput(this.outputKey, newValue);
                    return { changed: this.outputKey };
                }
            }
        }
    }

    public execute(context: WorkingContext): RuleEffect {
        const oldValue = context.getOutput(this.outputKey);
        const newValue = this.expression.evaluate(context);

        if (oldValue === newValue) {
            return {};
        } else {
            context.setOutput(this.outputKey, newValue);
            return { changed: this.outputKey };
        }
    }
}

export const StateRule = OutputRule;