import type { WorkingContext } from "../../types";
import type { Expression, NumericExpression } from "../expression";
import { BooleanFunctionExpression, NumericFunctionExpression } from "../function.expression";

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

    public evaluate(context: WorkingContext): number {
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'number') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a number`);
        }

        switch (this.name) {
            case 'max':
                return Math.max(targetValue, ...evaluatedArgs);
            case 'min':
                return Math.min(targetValue, ...evaluatedArgs);
            case 'avg':
                const sum = targetValue + evaluatedArgs.reduce((acc, val) => acc + val, 0);
                return sum / (1 + evaluatedArgs.length);
            case 'sum':
                return targetValue + evaluatedArgs.reduce((acc, val) => acc + val, 0);

            case 'ceil':
                return Math.ceil(targetValue);
            case 'floor':
                return Math.floor(targetValue);
            case 'round':
                return Math.round(targetValue);
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

            default:
                throw new Error(`Unknown numeric manipulation function: ${this.name}`);
        }
    }

    static names = ['max', 'min', 'avg', 'sum', 'ceil', 'floor', 'round', 'roundTo', 'add', 'subtract', 'multiply', 'divide', 'modulo', 'power', 'root', 'abs', 'sign', 'sqrt', 'log', 'log10', 'log2', 'exp'];
}

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