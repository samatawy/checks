import type { ArrayType, AtomicType, TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../types";
import { getReturnType, isArrayType, mergeValidationResults } from "../utils";
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

    public abstract returnsType(): AtomicType | ArrayType;

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
            const expectedType = expected[i]!.type;
            // console.debug(`Checking argument ${i + 1} for function ${this.name}: expected type ${expectedType}, actual type ${argType}`);
            if (expectedType === 'array') {
                // This is a special case, parameters of type array can accept any array type (string[], number[], etc.)
                if (!isArrayType(argType!)) {
                    // console.debug(`Array Type mismatch for argument ${i + 1} in function ${this.name}: expected array, got ${argType} (${arg})`);
                    checks.push({
                        valid: false,
                        errors: [`Argument ${i + 1} for function ${this.name} must be an array type, but got ${argType}`],
                    });
                }
            } else if (argType != expectedType) {
                // console.debug(`Type mismatch for argument ${i + 1} in function ${this.name}: expected ${expectedType}, got ${argType} (${arg})`);
                checks.push({
                    valid: false,
                    errors: [`Argument ${i + 1} for function ${this.name} must be of type ${expectedType}, but got ${argType}`],
                });
            }

            // Dive into the argument's own type checks as well
            checks.push(arg.checkTypes(checker));
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

    public returnsType(): AtomicType | ArrayType {
        return 'string';
    }

    public abstract evaluate(context: WorkingContext): string;
}

export abstract class NumericFunctionExpression extends FunctionExpression {

    public returnsType(): AtomicType | ArrayType {
        return 'number';
    }

    public abstract evaluate(context: WorkingContext): number;
}

export abstract class BooleanFunctionExpression extends FunctionExpression {

    public returnsType(): AtomicType | ArrayType {
        return 'boolean';
    }

    public abstract evaluate(context: WorkingContext): boolean;
}

export abstract class DateFunctionExpression extends FunctionExpression {

    public returnsType(): AtomicType | ArrayType {
        return 'date';
    }

    public abstract evaluate(context: WorkingContext): Date;
}