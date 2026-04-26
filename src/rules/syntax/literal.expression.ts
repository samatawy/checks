import type { WorkingContext } from "../types";
import { Expression } from "./expression";

export class LiteralExpression extends Expression {

    protected value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }

    public required(): Set<string> {
        return new Set();
    }

    public evaluate(context: WorkingContext): any {
        return this.value;
    }

    public toString(): string {
        if (typeof this.value === 'string') {
            return `"${this.value}"`;
        }
        return String(this.value);
    }
}