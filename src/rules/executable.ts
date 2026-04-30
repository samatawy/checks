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

    protected preparedEffect?: Partial<RuleEffect>;

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

    public prepareEffect(partial: Partial<RuleEffect>): this {
        this.preparedEffect = { ...this.preparedEffect, ...partial };
        return this;
    };

    public abstract toString(): string;

    public abstract checkTypes(checker?: TypeChecker): ValidationResult;

    public abstract execute(context: WorkingContext): RuleEffect;
}

/**
 * A simple action that sets a specific output key to the value of an expression when executed.
 * This is a common type of action that can be used in many rules to produce an output based on the evaluation of an expression.
 * The action specifies which output key it will set and what expression will be evaluated to determine the value to set.
 */
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
            return { ...this.preparedEffect, changed: this.key };
        }
    }
}

/**
 * A composite action allows for combining multiple executable actions into a single action that executes all of them together. 
 * This can be useful for rules that need to perform multiple operations as a consequence of being satisfied, 
 * such as setting multiple output values or performing a series of operations in sequence.
 */
export class CompositeAction extends ExecutableAction {

    private actions: ExecutableAction[];

    constructor(actions: ExecutableAction[]) {
        super();
        this.actions = actions;
    }

    public required(): Set<string> {
        const requirements = new Set<string>();
        for (const action of this.actions) {
            for (const req of action.required()) {
                requirements.add(req);
            }
        }
        return requirements;
    }

    public changes(): Set<string> {
        const changes = new Set<string>();
        for (const action of this.actions) {
            for (const change of action.changes()) {
                changes.add(change);
            }
        }
        return changes;
    }

    public toString(): string {
        return this.actions.map(action => action.toString()).join('; ');
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        const checks: ValidationResult[] = [];
        for (const action of this.actions) {
            checks.push(action.checkTypes(checker));
        }
        return mergeValidationResults(...checks);
    }

    public execute(context: WorkingContext): RuleEffect {
        const effects: RuleEffect[] = [];
        for (const action of this.actions) {
            const effect = action.execute(context);
            effects.push(effect);
            if (effect.exception) {
                break;
            }
        }
        // Merge effects
        const mergedEffect: RuleEffect = {};
        for (const effect of effects) {
            if (effect.exception) {
                mergedEffect.exception = effect.exception;
                break;
            }
            if (effect.changed) {
                let changes = mergedEffect.changed ? mergedEffect.changed + ', ' : '';
                mergedEffect.changed = changes + effect.changed;
            }
        }
        return { ...this.preparedEffect, ...mergedEffect };
    }
}

/**
 * An action that throws an exception when executed. 
 * This can be used in rules that need to indicate an error condition.
 */
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
        return { ...this.preparedEffect, exception: this.errorMessage };
    }
}    