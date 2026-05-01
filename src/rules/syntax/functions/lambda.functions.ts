import type { ArrayType, AtomicType, TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../../types";
import { getPathValue, getReturnType, isArrayType, mergeValidationResults } from "../../utils";
import type { Expression } from "../expression";
import { FunctionExpression } from "../function.expression";
import { LambdaExpression } from "../lambda.expression";
import type { VariableExpression } from "../variable.expression";

export class LambdaFunctionExpression extends FunctionExpression {

    protected name: string;

    protected target_arg: VariableExpression;

    protected lambda_arg: LambdaExpression;

    public constructor(name: string, args: Expression[]) {
        super(name, args);
        this.name = name;
        this.target_arg = args[0] as VariableExpression;
        this.lambda_arg = args[1] as LambdaExpression;
    }

    public requires(): Set<string> {
        const vars = new Set<string>();
        for (const arg of this.args) {
            const argReqs = arg.required();
            for (const req of argReqs) {
                vars.add(req);
            }
        }
        return vars;
    }

    public expectsParameters(): TypedParameter[] {
        return [
            { type: 'array' },
            { type: 'lambda' },
        ]
    }

    public returnsType(): AtomicType | ArrayType {
        switch (this.name) {
            case 'every':
            case 'any':
                return 'boolean';
            case 'map':
            case 'filter':
                const lambdaReturnType = getReturnType(this.lambda_arg, undefined);
                if (!lambdaReturnType) {
                    throw new Error(`Unable to determine return type of lambda argument in function ${this.name}`);
                }
                return lambdaReturnType;
            default:
                throw new Error(`Unknown lambda function: ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        const checks: ValidationResult[] = [];
        checks.push(this.target_arg.checkTypes(checker));
        checks.push(this.lambda_arg.checkTypes(checker));

        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        // const scope = new FunctionContext(context);
        const targetArray = this.target_arg.evaluate(context);

        if (!Array.isArray(targetArray)) {
            throw new Error(`First argument to ${this.name} must evaluate to an array, but got ${typeof targetArray}`);
        }
        if (!(this.lambda_arg instanceof LambdaExpression)) {
            throw new Error(`Second argument to ${this.name} must be a lambda expression`);
        }

        const values = targetArray.map((item: any) => {
            const scope = new FunctionContext(context);
            scope.setData(this.lambda_arg.getVariableName(), item);
            return this.lambda_arg.evaluate(scope);
        });

        switch (this.name) {
            case 'every':
                return values.reduce((acc, val) => acc && !!val, true);
            case 'any':
                return values.reduce((acc, val) => acc || !!val, false);
            case 'filter':
                return targetArray.filter((_: any, index: number) => !!values[index]);
            case 'map':
                return values;
            default:
                throw new Error(`Unknown lambda function: ${this.name}`);
        }
    }

    static names = ['every', 'any', 'filter', 'map'];
}

class FunctionContext implements WorkingContext {

    private parent: WorkingContext | null;

    private variables: Record<string, any>;

    constructor(parent: WorkingContext | null = null) {
        this.parent = parent;
        this.variables = {};
    }

    setData(key: string, value: any): void {
        this.variables[key] = value;
    }

    getData(key: string): any {
        const value = getPathValue(this.variables, key);
        if (value !== undefined) {
            return value;
        } else if (this.parent) {
            return this.parent.getData(key);
        } else {
            // console.debug(`Undefined variable access: ${key} in function context. Current variables:`, this.variables);
            throw new Error(`Undefined variable: ${key}`);
        }
        // if (key in this.variables) {
        //     return this.variables[key];
        // } else if (this.parent) {
        //     return this.parent.getData(key);
        // } else {
        //     // console.debug(`Undefined variable access: ${key} in function context. Current variables:`, this.variables);
        //     throw new Error(`Undefined variable: ${key}`);
        // }
    }

    hasData(key: string): boolean {
        if (key in this.variables) {
            return true;
        } else if (this.parent) {
            return this.parent.hasData(key);
        } else {
            return false;
        }
    }

    getConstant(key: string): any {
        return this.parent ? this.parent.getConstant(key) : this.getData(key);
    }

    hasConstant(key: string): boolean {
        return this.parent ? this.parent.hasConstant(key) : this.hasData(key);
    }

    rootKeys(): string[] {
        const keys = new Set<string>(Object.keys(this.variables));
        if (this.parent) {
            for (const key of this.parent.rootKeys()) {
                keys.add(key);
            }
        }
        return Array.from(keys);
    }

    addException(message: string, context: any): void {
        // For simplicity, we just throw an error here. In a real implementation, you might want to collect exceptions instead.
        throw new Error(`Function exception: ${message}. Context: ${JSON.stringify(context)}`);
    }

    setOutput(key: string, value: any): void {
        this.variables[key] = value;
    }

    getOutput(key?: string): any {
        if (key) {
            return this.getData(key);
        } else {
            return { ...this.variables };
        }
    }
}
