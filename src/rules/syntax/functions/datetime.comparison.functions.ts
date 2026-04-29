import type { TypedParameter, WorkingContext } from "../../types";
import type { DateExpression } from "../expression";
import { BooleanFunctionExpression } from "../function.expression";

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

    public expectsParameters(): TypedParameter[] {
        switch (this.name) {
            case 'equals':
            case 'notEquals':
            case 'before':
            case 'after':
            case 'sameYear':
            case 'sameMonth':
            case 'sameWeek':
            case 'sameDay':
            case 'sameHour':
            case 'sameMinute':
            case 'sameSecond':
                return [{ type: 'date' }, { type: 'date' }];
            default:
                throw new Error(`Unknown date/time comparison function: ${this.name}`);
        }
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
                throw new Error(`Unknown date/time comparison function: ${this.name}`);
        }
    }

    static names = ['equals', 'notEquals', 'before', 'after', 'sameYear', 'sameMonth', 'sameWeek', 'sameDay', 'sameHour', 'sameMinute', 'sameSecond'];
}
