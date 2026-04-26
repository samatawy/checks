import { AbstractRule } from "./abstract.rule";
import { ExceptionThrower, type ExecutableAction } from "../executable";
import type { Expression } from "../syntax/expression";
import type { Executor, WorkingContext, RuleEffect } from "../types";
import { RuleParser } from "../parser/rule.parser";

export class IfThenRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExecutableAction;

    constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = consequence as ExecutableAction;
        if (!condition || !consequence) {
            const parsed = new RuleParser().parse(syntax);
            if (parsed instanceof IfThenRule && parsed.condition && parsed.consequence) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
            } else {
                throw new Error(`Invalid syntax for IfThenRule: ${syntax}`);
            }
        }
        this.consequence = this.consequence || new ExceptionThrower(`Condition met: ${syntax} but no consequence provided`);
        this.require(...this.condition.required(), ...this.consequence.required());
        this.willChange(...this.consequence.changes());
    }

    public toString(): string {
        return `IF ${this.condition.toString()} THEN ${this.consequence.toString()}`;
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThenRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export class IfThenElseRule extends IfThenRule {

    protected alternative: ExecutableAction;

    constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null, alternative?: ExecutableAction | null) {
        super(syntax, condition, consequence);
        this.alternative = alternative as ExecutableAction;
        if (!alternative) {
            const parsed = new RuleParser().parse(syntax);
            if (parsed instanceof IfThenElseRule && parsed.alternative) {
                this.alternative = parsed.alternative;
            } else {
                throw new Error(`Invalid syntax for IfThenElseRule: ${syntax}`);
            }
        }
        this.consequence = this.consequence || new ExceptionThrower(`Condition met: ${syntax} but no consequence provided`);
        this.alternative = this.alternative || new ExceptionThrower(`Condition failed: ${syntax} but no alternative provided`);
        this.require(...this.condition.required(), ...this.consequence.required(), ...this.alternative.required());
        this.willChange(...this.consequence.changes(), ...this.alternative.changes());
    }

    public toString(): string {
        return `IF ${this.condition.toString()} THEN ${this.consequence.toString()} ELSE ${this.alternative.toString()}`;
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence : this.alternative;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThenElseRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export class IfThrowRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExceptionThrower;

    constructor(syntax: string, condition?: Expression | null, errorMessage?: ExceptionThrower | string) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = errorMessage instanceof ExceptionThrower ?
            errorMessage :
            new ExceptionThrower(errorMessage || `Condition met: ${syntax} but no error message provided`);

        if (!condition) {
            const parsed = new RuleParser().parse(syntax);
            if (parsed instanceof IfThrowRule && parsed.condition && parsed.consequence) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
            } else {
                throw new Error(`Invalid syntax for IfThrowRule: ${syntax}`);
            }
        }
        this.require(...this.condition.required(), ...this.consequence.required());
    }

    public toString(): string {
        return `IF ${this.condition.toString()} THROW ${this.consequence.toString()}`;
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThrowRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export const ExceptionRule = IfThrowRule;