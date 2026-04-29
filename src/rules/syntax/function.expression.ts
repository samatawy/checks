import type { TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../types";
import { getReturnType, mergeValidationResults } from "../utils";
import { Expression } from "./expression";

export abstract class FunctionExpression extends Expression {

    protected name: string;

    protected args: Expression[];

    constructor(name: string, args: Expression[]) {
        super();
        this.name = name;
        this.args = args;
    }

    public getName(): string {
        return this.name;
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

    /**
     * Returns an array of expected parameters for this function, in order. 
     * Each parameter includes its expected type and whether it is optional.
     * This is used for type checking and validation of function arguments.
     */
    public abstract expectsParameters(): TypedParameter[];

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        const checks: ValidationResult[] = [];
        for (const arg of this.args) {
            checks.push(arg.checkTypes(checker));
        }

        const expected = this.expectsParameters();
        let i = 0;
        for (const arg of this.args) {
            if (i >= expected.length) {
                checks.push({
                    valid: false,
                    errors: [`Function ${this.name} expects at most ${expected.length} arguments, but got ${this.args.length}`],
                });
                break;
            }
            const argType = getReturnType(arg, checker);
            if (argType != expected[i]!.type) {
                checks.push({
                    valid: false,
                    errors: [`Argument ${i + 1} for function ${this.name} must be of type ${expected[i]!.type}, but got ${argType}`],
                });
            }
            i++;
        }
        if (i < expected.length) {
            const missingParams = expected.slice(i).map(param => param.toString()).join(', ');
            checks.push({
                valid: false,
                errors: [`Function ${this.name} expects at least ${expected.length} arguments, but got ${this.args.length}. Missing parameters: ${missingParams}`],
            });
        }
        return mergeValidationResults(...checks);
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