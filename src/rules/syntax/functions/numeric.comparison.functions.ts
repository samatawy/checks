import type { WorkingContext } from "../../types";
import type { Expression, NumericExpression } from "../expression";
import { BooleanFunctionExpression, type TypedParameter } from "../function.expression";

export class NumericComparisonFunction extends BooleanFunctionExpression {

    protected name: string;

    protected target: NumericExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: NumericExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'equals':
            case 'notEquals':
            case 'greaterThan':
            case 'lessThan':
            case 'greaterThanOrEqual':
            case 'lessThanOrEqual':
                return [{ type: 'number' }, { type: 'number' }];
            case 'between':
                return [{ type: 'number' }, { type: 'number' }, { type: 'number' }];
            default:
                throw new Error(`Unknown numeric comparison function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): boolean {
        const targetValue = this.target.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a number`);
        }
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));
        for (const arg of evaluatedArgs) {
            if (typeof arg !== 'number') {
                throw new Error(`Arguments for function ${this.name} did not evaluate to numbers`);
            }
        }

        switch (this.name) {
            case 'equals':
                return targetValue === evaluatedArgs[0];
            case 'notEquals':
                return targetValue !== evaluatedArgs[0];
            case 'greaterThan':
                return targetValue > evaluatedArgs[0];
            case 'lessThan':
                return targetValue < evaluatedArgs[0];
            case 'greaterThanOrEqual':
                return targetValue >= evaluatedArgs[0];
            case 'lessThanOrEqual':
                return targetValue <= evaluatedArgs[0];
            case 'between':
                if (evaluatedArgs.length < 2) {
                    throw new Error(`Function ${this.name} requires two arguments for the bounds`);
                }
                if (typeof evaluatedArgs[0] !== 'number' || typeof evaluatedArgs[1] !== 'number') {
                    throw new Error(`Bounds arguments for function ${this.name} did not evaluate to numbers`);
                }
                return targetValue >= evaluatedArgs[0] && targetValue <= evaluatedArgs[1];
            default:
                throw new Error(`Unknown numeric comparison function: ${this.name}`);
        }
    }

    static names = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual', 'between'];
}
