import type { TypeChecker, ValidationResult, WorkingContext } from "../types";
import { Expression } from "./expression";

export class LambdaExpression extends Expression {

    protected variableName: string;

    protected expression: Expression;

    constructor(variableName: string, expression: Expression) {
        super();
        this.variableName = variableName;
        this.expression = expression;
    }

    public getVariableName(): string {
        return this.variableName;
    }

    public required(): Set<string> {
        return new Set([this.variableName, ...this.expression.required()]);
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        // We can't fully check the types of a lambda expression without knowing how it's used, but we can check the inner expression for any obvious issues.   
        // const checks: ValidationResult[] = [];
        // checks.push(this.expression.checkTypes(checker));
        // for (const check of checks) {
        //     if (!check.valid) {
        //         return check;
        //     }
        // }
        return this.expression.checkTypes(checker);
    }

    public evaluate(context: WorkingContext): any {
        return this.expression.evaluate(context);

        //const variableValue = context.getData(this.variableName);
        //
        // const scope: WorkingContext = {
        //     getData: (key: string) => {
        //         return (key === this.variableName) ? variableValue : context.getData(key);
        //     },
        //     hasData: (key: string) => {
        //         return (key === this.variableName) ? true : context.hasData(key);
        //     },
        //     getConstant: (key: string) => context.getConstant(key),
        //     hasConstant: (key: string) => context.hasConstant(key),
        //     rootKeys: () => context.rootKeys(),
        //     addException: (message: string, ctx: any) => context.addException(message, ctx),
        //     setOutput: (key: string, value: any) => context.setOutput(key, value),
        //     getOutput: () => context.getOutput(),
        // };
        // 
        // return this.expression.evaluate(scope);
    }

    public toString(): string {
        return this.variableName + " => " + this.expression.toString();
    }
}