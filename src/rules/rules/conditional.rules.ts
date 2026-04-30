import { AbstractRule } from "./abstract.rule";
import { ExceptionThrower, type ExecutableAction } from "../executable";
import type { Expression } from "../syntax/expression";
import type { Executor, WorkingContext, RuleEffect, TypeChecker, ValidationResult } from "../types";
import { RuleParser } from "../parser/rule.parser";
import { mergeValidationResults } from "../utils";
import type { WorkSpace } from "../..";

export class IfThenRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExecutableAction;

    static parse(syntax: string, workspace?: WorkSpace): IfThenRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThenRule) {
            return parsed;
        } else {
            throw new Error(`Invalid syntax for IfThenRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, condition: Expression, consequence: ExecutableAction): IfThenRule {
        return new IfThenRule(syntax, condition, consequence);
    }

    protected constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = consequence as ExecutableAction;
        if (!condition || !consequence) {
            const parsed = new RuleParser({}).parse(syntax);
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

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker)
        )
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence.prepareEffect({ satisfied: true }) : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThenRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export class IfThenElseRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExecutableAction;

    protected alternative: ExecutableAction;

    static parse(syntax: string, workspace?: WorkSpace): IfThenElseRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThenElseRule) {
            return parsed;
        } else {
            throw new Error(`Invalid syntax for IfThenElseRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, condition: Expression, consequence: ExecutableAction, alternative: ExecutableAction): IfThenElseRule {
        return new IfThenElseRule(syntax, condition, consequence, alternative);
    }

    protected constructor(syntax: string, condition?: Expression | null, consequence?: ExecutableAction | null, alternative?: ExecutableAction | null) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = consequence as ExecutableAction;
        this.alternative = alternative as ExecutableAction;
        if (!condition || !consequence || !alternative) {
            const parsed = new RuleParser({}).parse(syntax);
            if (parsed instanceof IfThenElseRule && parsed.condition && parsed.consequence && parsed.alternative) {
                this.condition = parsed.condition;
                this.consequence = parsed.consequence;
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

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker),
            this.alternative.checkTypes(checker)
        );
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ?
            this.consequence.prepareEffect({ satisfied: true }) :
            this.alternative.prepareEffect({ satisfied: false });
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThenElseRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export class IfThrowRule extends AbstractRule {

    protected condition: Expression;

    protected consequence: ExceptionThrower;

    static parse(syntax: string, workspace?: WorkSpace): IfThrowRule {
        const parsed = new RuleParser({ workspace }).parse(syntax);
        if (parsed instanceof IfThrowRule) {
            return parsed;
        } else {
            throw new Error(`Invalid syntax for IfThrowRule: ${syntax}`);
        }
    }

    static parsed(syntax: string, condition: Expression, error: ExceptionThrower | string): IfThrowRule {
        return new IfThrowRule(syntax, condition, error);
    }

    protected constructor(syntax: string, condition?: Expression | null, error?: ExceptionThrower | string) {
        super(syntax);
        this.condition = condition as Expression;
        this.consequence = error instanceof ExceptionThrower ?
            error :
            new ExceptionThrower(error || `Condition met: ${syntax} but no error message provided`);

        if (!condition) {
            const parsed = new RuleParser({}).parse(syntax);
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

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.consequence.checkTypes(checker)
        );
    }

    public evaluate(context: WorkingContext): Executor | null {
        return (this.condition.evaluate(context)) ? this.consequence.prepareEffect({ satisfied: true }) : null;
    }

    public execute(context: WorkingContext): RuleEffect {
        throw new Error('Direct execution of IfThrowRule is not supported. Please evaluate first to get the appropriate executor.');
    }
}

export const ExceptionRule = IfThrowRule;