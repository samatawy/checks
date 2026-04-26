import type { WorkingContext } from "../../types";
import type { Expression, StringExpression } from "../expression";
import { BooleanFunctionExpression, NumericFunctionExpression, StringFunctionExpression } from "../function.expression";

export class StringManipulationFunction extends StringFunctionExpression {

    protected name: string;

    protected target_arg: StringExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: StringExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target_arg = target;
        this.extra_args = args;
    }

    public evaluate(context: WorkingContext): string {
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'string') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a string`);
        }

        switch (this.name) {
            case 'substring':
                return targetValue.substring(evaluatedArgs[0], evaluatedArgs[1]);
            case 'firstChars':
                return targetValue.substring(0, evaluatedArgs[0]);
            case 'lastChars':
                return targetValue.substring(targetValue.length - evaluatedArgs[0]);
            case 'replace':
                return targetValue.replace(evaluatedArgs[0], evaluatedArgs[1]);
            case 'toUpperCase':
                return targetValue.toUpperCase();
            case 'toLowerCase':
                return targetValue.toLowerCase();
            case 'concat':
                return targetValue.concat(...evaluatedArgs);
            default:
                throw new Error(`Unknown string manipulation function: ${this.name}`);
        }
    }

    static names = ['substring', 'firstChars', 'lastChars', 'replace', 'toUpperCase', 'toLowerCase', 'concat'];
}

export class StringComparisonFunction extends BooleanFunctionExpression {

    protected name: string;

    protected left_arg: StringExpression;

    protected right_arg: StringExpression;

    constructor(name: string, left: StringExpression, right: StringExpression) {
        super(name, [left, right]);
        this.name = name;
        this.left_arg = left;
        this.right_arg = right;
    }

    public evaluate(context: WorkingContext): boolean {
        const leftValue = this.left_arg.evaluate(context);
        const rightValue = this.right_arg.evaluate(context);

        if (typeof leftValue !== 'string' || typeof rightValue !== 'string') {
            throw new Error(`Arguments for function ${this.name} did not evaluate to strings`);
        }

        switch (this.name) {
            case 'equals':
                return leftValue === rightValue;
            case 'notEquals':
                return leftValue !== rightValue;
            case 'contains':
                return leftValue.includes(rightValue);
            case 'startsWith':
                return leftValue.startsWith(rightValue);
            case 'endsWith':
                return leftValue.endsWith(rightValue);
            case 'matches':
                return new RegExp(rightValue).test(leftValue);
            default:
                throw new Error(`Unknown string comparison function: ${this.name}`);
        }
    }

    static names = ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'matches'];
}

export class StringInspectionFunction extends NumericFunctionExpression {

    protected name: string;

    protected target_arg: StringExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: StringExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target_arg = target;
        this.extra_args = args;
    }

    public evaluate(context: WorkingContext): number {
        const targetValue = this.target_arg.evaluate(context);
        if (typeof targetValue !== 'string') {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a string`);
        }
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        switch (this.name) {
            case 'length':
                return targetValue.length;
            case 'countOf':
                return targetValue.split(evaluatedArgs[0]).length - 1;
            case 'indexOf':
                return targetValue.indexOf(evaluatedArgs[0]);
            case 'lastIndexOf':
                return targetValue.lastIndexOf(evaluatedArgs[0]);
            default:
                throw new Error(`Unknown string inspection function: ${this.name}`);
        }
    }

    static names = ['length', 'countOf', 'indexOf', 'lastIndexOf'];
}