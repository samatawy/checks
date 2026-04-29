import type { TypedParameter, WorkingContext } from "../../types";
import type { DateExpression, Expression } from "../expression";
import { NumericFunctionExpression } from "../function.expression";

export class DateTimeInspectionFunction extends NumericFunctionExpression {

    protected name: string;

    protected target_arg: DateExpression;

    protected extra_args: Expression[];

    constructor(name: string, target: DateExpression, args: Expression[]) {
        super(name, [target, ...args]);
        this.name = name;
        this.target_arg = target;
        this.extra_args = args;
    }

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'year':
            case 'month':
            case 'week':
            case 'day':
            case 'hour':
            case 'minute':
            case 'second':
                return [{ type: 'date' }];
            default:
                throw new Error(`Unknown date/time inspection function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): number {
        const targetValue = this.target_arg.evaluate(context);
        if (!(targetValue instanceof Date)) {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a date`);
        }
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        switch (this.name) {
            case 'year':
                return targetValue.getFullYear();
            case 'month':
                return targetValue.getMonth() + 1; // Months are zero-indexed in JavaScript
            case 'week':
                const firstDayOfYear = new Date(targetValue.getFullYear(), 0, 1);
                const pastDaysOfYear = (targetValue.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000);
                return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
            case 'day':
                return targetValue.getDate();
            case 'hour':
                return targetValue.getHours();
            case 'minute':
                return targetValue.getMinutes();
            case 'second':
                return targetValue.getSeconds();
            default:
                throw new Error(`Unknown date/time inspection function: ${this.name}`);
        }
    }

    static names = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];
}