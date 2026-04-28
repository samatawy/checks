import type { WorkingContext } from "../../types";
import type { Expression, NumericExpression } from "../expression";
import { NumericFunctionExpression, type TypedParameter } from "../function.expression";

export class TrigonomicFunction extends NumericFunctionExpression {

    protected name: string;

    protected target_arg: NumericExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: NumericExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
                return [{ type: 'number' }];
            case 'atan2':
                return [{ type: 'number' }, { type: 'number' }];
            default:
                throw new Error(`Unknown trigonometric function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a number`);
        }

        switch (this.name) {
            case 'sin':
                return Math.sin(targetValue);
            case 'cos':
                return Math.cos(targetValue);
            case 'tan':
                return Math.tan(targetValue);
            case 'asin':
                return Math.asin(targetValue);
            case 'acos':
                return Math.acos(targetValue);
            case 'atan':
                return Math.atan(targetValue);
            case 'atan2':
                return Math.atan2(targetValue, evaluatedArgs[0]);
            default:
                throw new Error(`Unknown trigonometric function: ${this.name}`);
        }
    }

    static names = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2'];
}