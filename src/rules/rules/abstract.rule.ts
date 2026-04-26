import type { WorkingContext, Evaluator, RuleEffect, Executor } from "../types";

/**
 * Abstract base class for all rules in the system, providing common properties and methods for evaluating and executing rules. 
 * Each specific rule type (e.g. conditional rules, assignment rules) should extend this class 
 * and implement the abstract methods for evaluation and execution.
 */
export abstract class AbstractRule implements Evaluator, Executor {

    /**
     * Optional name for the rule, which can be used for identification and debugging purposes.
     */
    public name?: string;

    /**
     * Optional description for the rule, providing additional context or information about the rule's purpose and behavior.
     */
    public description?: string;

    private syntax: string;

    private salience?: number;

    private requirements: Set<string>;

    private changeTargets: Set<string>;

    constructor(syntax: string, salience?: number) {
        this.syntax = syntax;
        this.requirements = new Set<string>();
        this.changeTargets = new Set<string>();
        this.salience = salience;
    }

    /**
     * Get the original syntax string from which this rule was created. This can be useful for debugging and error reporting, as it allows you to see the exact rule definition that led to a particular rule instance.
     * @returns the original syntax string of the rule.
     */
    public getSyntax(): string {
        return this.syntax;
    }

    /**
     * Get the salience (priority) of the rule, which determines the order in which rules are evaluated and executed when multiple rules are applicable. Higher salience means higher priority. If salience is not set, it defaults to 0.
     * @returns the salience (priority) of the rule where 0 is default and 10 is the highest.
     */
    public getSalience(): number {
        return this.salience ?? 0;
    }

    /**
     * Set the salience (priority) of the rule, which determines the order in which rules are evaluated and executed when multiple rules are applicable. Higher salience means higher priority. If salience is not set, it defaults to 0.
     * @param salience the salience (priority) of the rule where 0 is default and 10 is the highest.
     */
    public setSalience(salience: number): void {
        this.salience = salience;
    }

    protected require(...requirements: string[]): void {
        for (const requirement of requirements) {
            this.requirements.add(requirement);
        }
    }

    /**
     * What data keys are required for this rule to be applicable? 
     * This is determined by the specific implementation of the rule and should be set during the construction of the instance. 
     * The rule engine uses this information to determine which rules are applicable based on the current context.
     * @returns a set of data keys required for this rule to be applicable.
     */
    public required(): Set<string> {
        return new Set(this.requirements);
    }

    /**
     * Specify the data keys that this rule will change when executed.
     * This is determined by the specific implementation of the rule and should be set during the construction of the instance. 
     * The rule engine uses this information to manage potential conflicts between rules that change the same data keys, 
     * especially when strict conflict resolution is enabled.
     * @param targets the data keys that this rule will change when executed.
     */
    public willChange(...targets: string[]): void {
        for (const target of targets) {
            this.changeTargets.add(target);
        }
    }

    public changes(): Set<string> {
        return new Set(this.changeTargets);
    }

    /**
     * Whether this rule is applicable in the given context, 
     * based on whether all of its required data keys are present in the context.
     * @param context the current working context containing data and constants.
     * @returns true if the rule is applicable, false otherwise.
     */
    public applicable(context: WorkingContext): boolean {
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

    /**
     * Evaluate the rule in the given context to determine if it is satisfied and should be executed.
     * @param context the current working context containing data and constants.
     * @returns an executor if the rule is satisfied, null otherwise.
     */
    public abstract evaluate(context: WorkingContext): Executor | null;

    /**
     * Execute the rule in the given context and return the effect of the execution.
     * This method should only be called if the rule has been evaluated and found to be satisfied.
     * @param context the current working context containing data and constants.
     * @returns the effect of executing the rule.
     */
    public abstract execute(context: WorkingContext): RuleEffect;
}
