import type { ArrayType, AtomicType, TypeChecker, ValidationResult, WorkingContext } from "../types";
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

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType {
        const trueType = getReturnType(this.trueExpression, checker);
        const falseType = getReturnType(this.falseExpression, checker);
        if (trueType && falseType && trueType === falseType) {
            return trueType as AtomicType | ArrayType;
        }
        throw new Error(`Unable to determine return type of ternary expression: true branch returns ${trueType}, false branch returns ${falseType}`);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];

        if (!checker || checker.strictSyntax()) {
            const conditionType = getReturnType(this.condition, checker);
            if (conditionType !== 'boolean') {
                checks.push({
                    valid: false,
                    errors: [`Ternary condition must be of type boolean, but got ${conditionType}`],
                });
            }

            const leftType = getReturnType(this.trueExpression, checker);
            const rightType = getReturnType(this.falseExpression, checker);

            const ok = (checker?.strictInputs()) ?
                (leftType && rightType && leftType === rightType) :
                (!leftType || !rightType || leftType === rightType);

            if (!ok) {
                checks.push({
                    valid: false,
                    errors: [`Ternary expressions must return the same type, but got ${leftType} and ${rightType}`],
                });
            }
        }

        return mergeValidationResults(
            this.condition.checkTypes(checker),
            this.trueExpression.checkTypes(checker),
            this.falseExpression.checkTypes(checker),
            ...checks
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