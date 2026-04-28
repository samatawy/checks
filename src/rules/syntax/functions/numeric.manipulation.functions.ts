import type { WorkingContext } from "../../types";
import type { Expression, NumericExpression } from "../expression";
import { NumericFunctionExpression, type TypedParameter } from "../function.expression";

export class NumericManipulationFunction extends NumericFunctionExpression {

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
            case 'abs':
            case 'sign':
            case 'sqrt':
            case 'log':
            case 'log10':
            case 'log2':
            case 'exp':
            case 'ceil':
            case 'floor':
            case 'round':
                return [{ type: 'number' }];

            case 'max':
            case 'min':
            case 'avg':
            case 'sum':
            case 'roundTo':

            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
            case 'modulo':
            case 'power':
            case 'root':
                return [{ type: 'number' }, { type: 'number' }];
            default:
                throw new Error(`Unknown numeric manipulation function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a number`);
        }

        switch (this.name) {
            case 'abs':
                return Math.abs(targetValue);
            case 'sign':
                return Math.sign(targetValue);
            case 'sqrt':
                return Math.sqrt(targetValue);
            case 'log':
                return Math.log(targetValue);
            case 'log10':
                return Math.log10(targetValue);
            case 'log2':
                return Math.log2(targetValue);
            case 'exp':
                return Math.exp(targetValue);
            case 'ceil':
                return Math.ceil(targetValue);
            case 'floor':
                return Math.floor(targetValue);
            case 'round':
                return Math.round(targetValue);

            case 'max':
                return Math.max(targetValue, ...evaluatedArgs);
            case 'min':
                return Math.min(targetValue, ...evaluatedArgs);
            case 'avg':
                const sum = targetValue + evaluatedArgs.reduce((acc, val) => acc + val, 0);
                return sum / (1 + evaluatedArgs.length);
            case 'sum':
                return targetValue + evaluatedArgs.reduce((acc, val) => acc + val, 0);

            case 'roundTo':
                const factor = Math.pow(10, evaluatedArgs[0]);
                return Math.round(targetValue * factor) / factor;

            case 'add':
                return targetValue + evaluatedArgs[0];
            case 'subtract':
                return targetValue - evaluatedArgs[0];
            case 'multiply':
                return targetValue * evaluatedArgs[0];
            case 'divide':
                if (evaluatedArgs[0] === 0) {
                    throw new Error("Division by zero");
                }
                return targetValue / evaluatedArgs[0];
            case 'modulo':
                if (evaluatedArgs[0] === 0) {
                    throw new Error("Division by zero");
                }
                return targetValue % evaluatedArgs[0];
            case 'power':
                return Math.pow(targetValue, evaluatedArgs[0]);
            case 'root':
                return Math.pow(targetValue, 1 / evaluatedArgs[0]);

            default:
                throw new Error(`Unknown numeric manipulation function: ${this.name}`);
        }
    }

    static names = ['max', 'min', 'avg', 'sum', 'ceil', 'floor', 'round', 'roundTo', 'add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'root', 'abs', 'sign', 'sqrt', 'log', 'log10', 'log2', 'exp'];
}
