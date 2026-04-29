import type { TypedParameter, WorkingContext } from "../../types";
import type { Expression, StringExpression } from "../expression";
import { StringFunctionExpression } from "../function.expression";

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

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'substring':
                return [{ type: 'string' }, { type: 'number' }, { type: 'number', optional: true }];
            case 'firstChars':
            case 'lastChars':
                return [{ type: 'string' }, { type: 'number' }];
            case 'replace':
            case 'concat':
                return [{ type: 'string' }, { type: 'string' }];
            case 'toUpperCase':
            case 'toLowerCase':
                return [{ type: 'string' }];
            default:
                throw new Error(`Unknown string manipulation function: ${this.name}`);
        }
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