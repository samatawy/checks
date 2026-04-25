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

export interface RuleEffect {

    satisfied?: boolean;

    changed?: string;

    exception?: string;
}

export interface Evaluator {

    evaluate(context: RuleContext): RuleEffect;
}

export interface Executor {

    execute(context: RuleContext): RuleEffect;
}