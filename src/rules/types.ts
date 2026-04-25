export interface RuleContext {

    getData(key: string): any;

    hasData(key: string): boolean;

    getConstant(key: string): any;

    hasConstant(key: string): boolean;

    rootKeys(): string[];

    addException(message: string, context: any): void;

    setOutput(key: string, value: any): void;

    getOutput(key?: string): any;
}

export interface Evaluator {

    evaluate(context: RuleContext): boolean;
}

export interface Executor {

    execute(context: RuleContext): void;
}