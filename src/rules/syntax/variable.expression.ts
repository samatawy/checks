import type { RuleContext } from "../types";
import { Expression } from "./expression";

export class VariableExpression extends Expression {

    protected variableName: string;

    constructor(variableName: string) {
        super();
        this.variableName = variableName;
    }

    public required(): Set<string> {
        return new Set([this.variableName]);
    }

    public evaluate(context: RuleContext): any {
        return context.getData(this.variableName) || context.getConstant(this.variableName);
    }

    public toString(): string {
        return this.variableName;
    }
}