import type { TypedParameter, WorkingContext } from "../../types";
import type { DateExpression, Expression } from "../expression";
import { DateFunctionExpression } from "../function.expression";

export class DateTimeManipulationFunction extends DateFunctionExpression {

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
            case 'addYears':
            case 'addMonths':
            case 'addWeeks':
            case 'addDays':
            case 'addHours':
            case 'addMinutes':
            case 'addSeconds':
            case 'subtractYears':
            case 'subtractMonths':
            case 'subtractWeeks':
            case 'subtractDays':
            case 'subtractHours':
            case 'subtractMinutes':
            case 'subtractSeconds':
                return [{ type: 'date' }, { type: 'number' }];
            default:
                throw new Error(`Unknown date/time manipulation function: ${this.name}`);
        }
    }

    public evaluate(context: WorkingContext): Date {
        const evaluatedArgs = this.extra_args.map(arg => arg.evaluate(context));

        const targetValue = this.target_arg.evaluate(context);
        if (!(targetValue instanceof Date)) {
            throw new Error(`Target argument for function ${this.name} did not evaluate to a Date`);
        }

        switch (this.name) {
            case 'addYears':
                return new Date(targetValue.getFullYear() + evaluatedArgs[0], targetValue.getMonth(), targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'addMonths':
                return new Date(targetValue.getFullYear(), targetValue.getMonth() + evaluatedArgs[0], targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'addWeeks':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 7 * 24 * 60 * 60 * 1000);
            case 'addDays':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 24 * 60 * 60 * 1000);
            case 'addHours':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 60 * 60 * 1000);
            case 'addMinutes':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 60 * 1000);
            case 'addSeconds':
                return new Date(targetValue.getTime() + evaluatedArgs[0] * 1000);

            case 'subtractYears':
                return new Date(targetValue.getFullYear() - evaluatedArgs[0], targetValue.getMonth(), targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'subtractMonths':
                return new Date(targetValue.getFullYear(), targetValue.getMonth() - evaluatedArgs[0], targetValue.getDate(), targetValue.getHours(), targetValue.getMinutes(), targetValue.getSeconds(), targetValue.getMilliseconds());
            case 'subtractWeeks':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 7 * 24 * 60 * 60 * 1000);
            case 'subtractDays':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 24 * 60 * 60 * 1000);
            case 'subtractHours':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 60 * 60 * 1000);
            case 'subtractMinutes':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 60 * 1000);
            case 'subtractSeconds':
                return new Date(targetValue.getTime() - evaluatedArgs[0] * 1000);
            default:
                throw new Error(`Unknown date/time manipulation function: ${this.name}`);
        }
    }

    static names = ['addYears', 'addMonths', 'addWeeks', 'addDays', 'addHours', 'addMinutes', 'addSeconds', 'subtractYears', 'subtractMonths', 'subtractWeeks', 'subtractDays', 'subtractHours', 'subtractMinutes', 'subtractSeconds'];
}
