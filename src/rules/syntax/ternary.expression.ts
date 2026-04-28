import type { TypeChecker, ValidationResult, WorkingContext } from "../types";
import { getReturnType, mergeValidationResults } from "../utils";
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

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        const conditionType = getReturnType(this.condition, checker);
        const check = (conditionType === 'boolean') ? {
            valid: true,
        } : {
            valid: false,
            errors: [`Ternary condition must be of type boolean, but got ${conditionType}`],
        };

        const leftType = getReturnType(this.trueExpression, checker);
        const rightType = getReturnType(this.falseExpression, checker);
        const expressionCheck = (leftType === rightType) ? {
            valid: true,
        } : {
            valid: false,
            errors: [`Ternary expressions must return the same type, but got ${leftType} and ${rightType}`],
        };

        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.trueExpression.checkTypes(checker),
            this.falseExpression.checkTypes(checker),
            check,
            expressionCheck
        );
    }

    public evaluate(context: WorkingContext): any {
        const conditionValue = this.condition.evaluate(context);
        return conditionValue ? this.trueExpression.evaluate(context) : this.falseExpression.evaluate(context);
    }

    public toString(): string {
        return `(${this.condition.toString()} ? ${this.trueExpression.toString()} : ${this.falseExpression.toString()})`;
    }
}