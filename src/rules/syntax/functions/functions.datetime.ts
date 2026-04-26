import type { WorkingContext } from "../../types";
import type { DateExpression, Expression, StringExpression } from "../expression";
import { BooleanFunctionExpression, DateFunctionExpression, NumericFunctionExpression, StringFunctionExpression } from "../function.expression";

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
                throw new Error(`Unknown date manipulation function: ${this.name}`);
        }
    }

    static names = ['addYears', 'addMonths', 'addWeeks', 'addDays', 'addHours', 'addMinutes', 'addSeconds', 'subtractYears', 'subtractMonths', 'subtractWeeks', 'subtractDays', 'subtractHours', 'subtractMinutes', 'subtractSeconds'];
}

export class DateTimeComparisonFunction extends BooleanFunctionExpression {

    protected name: string;

    protected left_arg: DateExpression;

    protected right_arg: DateExpression;

    constructor(name: string, left: DateExpression, right: DateExpression) {
        super(name, [left, right]);
        this.name = name;
        this.left_arg = left;
        this.right_arg = right;
    }

    public evaluate(context: WorkingContext): boolean {
        const leftValue = this.left_arg.evaluate(context);
        const rightValue = this.right_arg.evaluate(context);

        if (!(leftValue instanceof Date) || !(rightValue instanceof Date)) {
            throw new Error(`Arguments for function ${this.name} did not evaluate to dates`);
        }

        switch (this.name) {
            case 'equals':
                return leftValue.getTime() === rightValue.getTime();
            case 'notEquals':
                return leftValue.getTime() !== rightValue.getTime();
            case 'before':
                return leftValue.getTime() < rightValue.getTime();
            case 'after':
                return leftValue.getTime() > rightValue.getTime();
            case 'sameYear':
                return leftValue.getFullYear() === rightValue.getFullYear();
            case 'sameMonth':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth();
            case 'sameWeek':
                const leftWeekStart = new Date(leftValue);
                leftWeekStart.setDate(leftWeekStart.getDate() - leftWeekStart.getDay());
                leftWeekStart.setHours(0, 0, 0, 0);

                const rightWeekStart = new Date(rightValue);
                rightWeekStart.setDate(rightWeekStart.getDate() - rightWeekStart.getDay());
                rightWeekStart.setHours(0, 0, 0, 0);

                return leftWeekStart.getTime() === rightWeekStart.getTime();
            case 'sameDay':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate();
            case 'sameHour':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours();
            case 'sameMinute':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes();
            case 'sameSecond':
                return leftValue.getFullYear() === rightValue.getFullYear() && leftValue.getMonth() === rightValue.getMonth() && leftValue.getDate() === rightValue.getDate() && leftValue.getHours() === rightValue.getHours() && leftValue.getMinutes() === rightValue.getMinutes() && leftValue.getSeconds() === rightValue.getSeconds();

            default:
                throw new Error(`Unknown string comparison function: ${this.name}`);
        }
    }

    static names = ['equals', 'notEquals', 'before', 'after', 'sameYear', 'sameMonth', 'sameWeek', 'sameDay', 'sameHour', 'sameMinute', 'sameSecond'];
}

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
                throw new Error(`Unknown date inspection function: ${this.name}`);
        }
    }

    static names = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];
}