import type { TypedParameter, WorkingContext } from "../../types";
import type { Expression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";

export class ArrayInspectionFunction extends NumericFunctionExpression {

    protected name: string;

    protected target_arg: Expression;

    constructor(name: string, target: Expression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target_arg = target;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'count':
                return [{ type: 'array' }];
            case 'total':
            case 'average':
            case 'smallest':
            case 'largest':
            case 'range':
                return [{ type: 'number[]' }];
            default:
                throw new Error(`Unknown array inspection function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const targetValue = this.target_arg.evaluate(context);
        if (!Array.isArray(targetValue)) {
            console.debug('Received argument', targetValue, `for argument ${this.target_arg} in function ${this.name}`);
            throw new Error(`Target argument for function ${this.name} did not evaluate to an array`);
        }

        switch (this.name) {
            case 'count':
                return targetValue.length;
            case 'total':
                return targetValue.reduce((acc, val) => acc + val, 0);
            case 'average':
                return targetValue.reduce((acc, val) => acc + val, 0) / targetValue.length;
            case 'smallest':
                return Math.min(...targetValue);
            case 'largest':
                return Math.max(...targetValue);
            case 'range':
                return Math.max(...targetValue) - Math.min(...targetValue);
            default:
                throw new Error(`Unknown array inspection function: ${this.name}`);
        }
    }

    static names = ['count', 'total', 'average', 'smallest', 'largest', 'range'];
}
