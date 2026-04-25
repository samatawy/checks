import type { Expression } from "./syntax/expression";
import type { Executor, RuleContext } from "./types";

export abstract class ExecutableAction implements Executor {

    public abstract required(): Set<string>;

    public abstract toString(): string;

    public abstract execute(context: RuleContext): void;
}

// TODO: Is this required? Can we just use OutputRule instead of OutputAction?
export class OutputAction extends ExecutableAction {

    private key: string;

    private value: Expression;

    constructor(key: string, value: Expression) {
        super();
        this.key = key;
        this.value = value;
    }

    public required(): Set<string> {
        return this.value.required();
    }

    public toString(): string {
        return `SET ${this.key} = ${this.value.toString()}`;
    }

    public execute(context: RuleContext): void {
        context.setOutput(this.key, this.value.evaluate(context));
    }
}

// TODO: Is this required? Can we just use IfThrowRule instead of ExceptionAction?
export class ExceptionThrower extends ExecutableAction {

    private errorMessage: string;

    constructor(errorMessage: string) {
        super();
        this.errorMessage = errorMessage;
    }

    public required(): Set<string> {
        return new Set();
    }

    public toString(): string {
        return `THROW ${this.errorMessage}`;
    }

    public execute(context: RuleContext): void {
        context.addException(this.errorMessage, context);
    }
}    