import { AbstractRule } from "./abstract.rule";
import type { Expression } from "../syntax/expression";
import type { Executor, WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../types";
import { RuleParser } from "../parser/rule.parser";
import { getReturnType, isAtomicType, mergeValidationResults } from "../utils";

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

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];
        if (checker?.strictInputs()) {
            checks.push(this.expression.checkTypes(checker));
        }
        if (checker?.strictOutputs()) {
            if (!checker.hasType(this.outputKey)) {
                checks.push({ valid: false, errors: [`Undefined output variable: ${this.outputKey}`] });
            }
            const keyType = checker.getType(this.outputKey);
            if (!isAtomicType(keyType!)) {
                checks.push({ valid: false, errors: [`Output key '${this.outputKey}' is not an atomic type`] });
            }
            const returnType = getReturnType(this.expression, checker);
            if (keyType && returnType && keyType !== returnType) {
                checks.push({
                    valid: false,
                    errors: [`Type mismatch for output key '${this.outputKey}': expected ${keyType}, but got ${returnType}`]
                });
            }
        }
        return mergeValidationResults(...checks);
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