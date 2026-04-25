import type { RuleContext, Evaluator } from "../types";

export abstract class AbstractRule implements Evaluator {

    public name?: string;

    public description?: string;

    private syntax: string;

    private requirements: Set<string>;

    constructor(syntax: string) {
        this.syntax = syntax;
        this.requirements = new Set<string>();
    }

    public getSyntax(): string {
        return this.syntax;
    }

    protected require(...requirements: string[]): void {
        for (const requirement of requirements) {
            this.requirements.add(requirement);
        }
    }

    public required(): Set<string> {
        return new Set(this.requirements);
    }

    public applicable(context: RuleContext): boolean {
        const required = this.required();
        if (required.size === 0) {
            return true;
        }
        for (const requirement of required) {
            if (!context.hasData(requirement) && !context.hasConstant(requirement)) {
                return false;
            }
        }
        return true;
    }

    public abstract toString(): string;

    public abstract evaluate(context: RuleContext): boolean;
}
