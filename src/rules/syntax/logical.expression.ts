import type { WorkingContext } from "../types";
import { BooleanExpression, Expression } from "./expression";

export class LogicalExpression extends BooleanExpression {

    protected operator: string;

    protected left: Expression;

    protected right: Expression;

    constructor(operator: string, left: Expression, right: Expression) {
        super();
        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    public required(): Set<string> {
        const leftRequirements = this.left.required();
        const rightRequirements = this.right.required();
        return new Set([...leftRequirements, ...rightRequirements]);
    }

    public evaluate(context: WorkingContext): boolean {
        const leftValue = this.left.evaluate(context);
        const rightValue = this.right.evaluate(context);

        switch (this.operator) {
            case 'AND':
                return leftValue && rightValue;
            case 'OR':
                return leftValue || rightValue;
            default:
                throw new Error(`Unsupported logical operator: ${this.operator}`);
        }
    }

    public toString(): string {
        return `(${this.left.toString()} ${this.operator} ${this.right.toString()})`;
    }
}