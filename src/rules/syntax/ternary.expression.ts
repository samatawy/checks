import type { WorkingContext } from "../types";
import { Expression } from "./expression";

export class TernaryExpression extends Expression {

    protected condition: Expression;

    protected trueExpression: Expression;

    protected falseExpression: Expression;

    constructor(condition: Expression, trueExpression: Expression, falseExpression: Expression) {
        super();
        this.condition = condition;
        this.trueExpression = trueExpression;
        this.falseExpression = falseExpression;
    }

    public required(): Set<string> {
        const conditionRequirements = this.condition.required();
        const trueRequirements = this.trueExpression.required();
        const falseRequirements = this.falseExpression.required();
        return new Set([...conditionRequirements, ...trueRequirements, ...falseRequirements]);
    }

    public evaluate(context: WorkingContext): any {
        const conditionValue = this.condition.evaluate(context);
        return conditionValue ? this.trueExpression.evaluate(context) : this.falseExpression.evaluate(context);
    }

    public toString(): string {
        return `(${this.condition.toString()} ? ${this.trueExpression.toString()} : ${this.falseExpression.toString()})`;
    }
}