export interface WorkingContext {

    getData(key: string): any;

    hasData(key: string): boolean;

    getConstant(key: string): any;

    hasConstant(key: string): boolean;

    rootKeys(): string[];

    addException(message: string, context: any): void;

    setOutput(key: string, value: any): void;

    getOutput(key?: string): any;
}

export interface RuleEffect {

    /**
     * Indicates whether the rule was satisfied when evaluated. This can be used by the rule engine to determine if the rule should be executed or not.
     */
    satisfied?: boolean;

    /**
     * Indicates which data key was changed as a result of executing the rule. This can be used by the rule engine to track changes and manage dependencies between rules.
     */
    changed?: string;

    /**
     * Indicates an exception that was thrown during the execution of the rule. This can be used by the rule engine to handle errors and take appropriate actions.
     */
    exception?: string;
}

export interface Evaluator {

    evaluate(context: WorkingContext): Executor | null;
}

export interface Executor {

    // /**
    //  * Get the data keys that this executor will change when executed.
    //  * @returns a set of data keys that will be changed when this executor is executed.
    //  */
    changes(): Set<string>;

    /**
     * Execute the required action in the given context and return the effects of the execution.
     * @param context the current working context containing data and constants.
     * @returns the effects of executing the action, including any changes or exceptions.
     */
    execute(context: WorkingContext): RuleEffect;
}