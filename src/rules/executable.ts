import type { Expression } from "./syntax/expression";
import type { Executor, WorkingContext, RuleEffect, HasValidity, TypeChecker, ValidationResult, AtomicType } from "./types";
import { getReturnType, isAtomicType, mergeValidationResults } from "./utils";

/**
 * An executable action represents a specific operation that can be executed in the context of a rule.
 * This can include actions like setting an output value, throwing an exception, or any other operation 
 * that can be performed as a consequence of a rule being satisfied.
 * Each executable action must specify what data keys it requires to be evaluated and what data keys it will change when executed. 
 * This allows the rule engine to manage dependencies between rules and ensure that rules are executed 
 * in the correct order based on their requirements and effects.
 */
export abstract class ExecutableAction implements Executor, HasValidity {

    /**
     * What data keys are required for this action to be evaluated? 
     * @returns a set of data keys required for this action to be evaluated.
     */
    public abstract required(): Set<string>;

    /**
     * What data keys will be changed when this action is executed? 
     * @returns a set of data keys that will be changed when this action is executed.
     */
    public abstract changes(): Set<string>;

    public abstract toString(): string;

    public abstract checkTypes(checker?: TypeChecker): ValidationResult;

    public abstract execute(context: WorkingContext): RuleEffect;
}

// TODO: Is this required? Can we just use OutputRule instead of OutputAction?
export class OutputAction extends ExecutableAction {

    private key: string;

    private value: Expression;

    constructor(key: string, value: Expression) {
        super();
        this.key = key;
        this.value = value;
    }

    public required(): Set<string> {
        return this.value.required();
    }

    public changes(): Set<string> {
        return new Set(this.key);
    }

    public toString(): string {
        return `SET ${this.key} = ${this.value.toString()}`;
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker) {
            return { valid: true };
        }

        const checks: ValidationResult[] = [];
        if (checker.strictInputs()) {
            checks.push(this.value.checkTypes(checker));
        }
        if (checker.strictOutputs()) {
            if (!checker.hasType(this.key)) {
                checks.push({ valid: false, errors: [`Undefined output variable: ${this.key}`] });
            }
            const keyType = checker.getType(this.key);
            if (!isAtomicType(keyType!)) {
                checks.push({ valid: false, errors: [`Output key '${this.key}' is not an atomic type`] });
            }
            const returnType = getReturnType(this.value, checker);
            if (keyType && returnType && keyType !== returnType) {
                checks.push({
                    valid: false,
                    errors: [`Type mismatch for output key '${this.key}': expected ${keyType}, but got ${returnType}`]
                });
            }
        }
        return mergeValidationResults(...checks);
    }

    public execute(context: WorkingContext): RuleEffect {
        const oldValue = context.getOutput(this.key);
        const newValue = this.value.evaluate(context);

        if (oldValue === newValue) {
            return {};
        } else {
            context.setOutput(this.key, newValue);
            return { changed: this.key };
        }
    }
}

// TODO: Is this required? Can we just use IfThrowRule instead of ExceptionAction?
export class ExceptionThrower extends ExecutableAction {

    private errorMessage: string;

    constructor(errorMessage: string) {
        super();
        this.errorMessage = errorMessage;
    }

    public required(): Set<string> {
        return new Set();
    }

    public changes(): Set<string> {
        return new Set();
    }

    public toString(): string {
        return `THROW ${this.errorMessage}`;
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        return { valid: true };
    }

    public execute(context: WorkingContext): RuleEffect {
        context.addException(this.errorMessage, context);
        return { exception: this.errorMessage };
    }
}    