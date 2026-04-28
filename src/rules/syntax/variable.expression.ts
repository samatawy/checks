import type { TypeChecker, ValidationResult, WorkingContext } from "../types";
import { Expression } from "./expression";

export class VariableExpression extends Expression {

    protected variableName: string;

    constructor(variableName: string) {
        super();
        this.variableName = variableName;
    }

    public getVariableName(): string {
        return this.variableName;
    }

    public required(): Set<string> {
        return new Set([this.variableName]);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        if (!checker.hasType(this.variableName)) {
            return { valid: false, errors: [`Undefined variable: ${this.variableName}`] };
        } else {
            return { valid: true };
        }
    }

    public evaluate(context: WorkingContext): any {
        return context.getData(this.variableName) || context.getConstant(this.variableName);
    }

    public toString(): string {
        return this.variableName;
    }
}