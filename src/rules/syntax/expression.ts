import type { RuleContext, Evaluator } from "../types";

export abstract class Expression implements Evaluator {

    protected syntax: string;

    constructor() {
        this.syntax = '';
    }

    public setSyntax(syntax: string): void {
        this.syntax = syntax;
    }

    public getSyntax(): string {
        return this.syntax;
    }

    public abstract required(): Set<string>;

    public abstract evaluate(context: RuleContext): any;

    public abstract toString(): string;
}

export abstract class BooleanExpression extends Expression {

    public abstract evaluate(context: RuleContext): boolean;
}

export abstract class NumericExpression extends Expression {

    public abstract evaluate(context: RuleContext): number;
}

export abstract class StringExpression extends Expression {

    public abstract evaluate(context: RuleContext): string;
}

export abstract class DateExpression extends Expression {

    public abstract evaluate(context: RuleContext): Date;
}