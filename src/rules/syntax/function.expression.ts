import type { WorkingContext } from "../types";
import { Expression } from "./expression";

export abstract class FunctionExpression extends Expression {

    protected name: string;

    protected args: Expression[];

    constructor(name: string, args: Expression[]) {
        super();
        this.name = name;
        this.args = args;
    }

    public required(): Set<string> {
        const requirements = new Set<string>();
        for (const arg of this.args) {
            const argRequirements = arg.required();
            for (const req of argRequirements) {
                requirements.add(req);
            }
        }
        return requirements;
    }

    public toString(): string {
        const argsString = this.args.map(arg => arg.toString()).join(', ');
        return `${this.name}(${argsString})`;
    }

    public abstract evaluate(context: WorkingContext): any;
}

export abstract class StringFunctionExpression extends FunctionExpression {

    public abstract evaluate(context: WorkingContext): string;
}

export abstract class NumericFunctionExpression extends FunctionExpression {

    public abstract evaluate(context: WorkingContext): number;
}

export abstract class BooleanFunctionExpression extends FunctionExpression {

    public abstract evaluate(context: WorkingContext): boolean;
}

export abstract class DateFunctionExpression extends FunctionExpression {

    public abstract evaluate(context: WorkingContext): Date;
}