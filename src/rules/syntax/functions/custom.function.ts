import type { FunctionDefinition, TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../../types";
import { getReturnType, mergeValidationResults } from "../../utils";
import type { Expression } from "../expression";
import { FunctionExpression } from "../function.expression";

export class CustomFunctionExpression extends FunctionExpression {

    static from(definition: FunctionDefinition, args: Expression[]): CustomFunctionExpression {
        const expr = new CustomFunctionExpression(definition.name, args);
        expr.definition = definition;
        return expr;
    }

    protected definition?: FunctionDefinition;

    protected constructor(name: string, args: Expression[]) {
        super(name, args);
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
        if (this.definition) {
            return this.definition.parameters;
        } else {
            throw new Error(`Function definition not found for function ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!this.definition) {
            throw new Error(`Function definition not found for function ${this.name}`);
        }
        if (!checker || !checker.strictInputs()) {
            return { valid: true };
        }

        const expected = this.expectsParameters();
        const checks: ValidationResult[] = [];
        let i = 0;
        for (const arg of this.args) {
            if (i >= expected.length) {
                checks.push({
                    valid: false,
                    errors: [`Function ${this.name} expects at most ${expected.length} arguments, but got ${this.args.length}`],
                });
                break;
            }
            const argType = getReturnType(arg, checker);
            if (argType != expected[i]!.type) {
                checks.push({
                    valid: false,
                    errors: [`Argument ${i + 1} for function ${this.name} must be of type ${expected[i]!.type}, but got ${argType}`],
                });
            }
            checks.push(arg.checkTypes(checker));
            i++;
        }
        if (i < expected.length) {
            const missingParams = expected.slice(i).map(param => param.toString()).join(', ');
            checks.push({
                valid: false,
                errors: [`Function ${this.name} expects at least ${expected.length} arguments, but got ${this.args.length}. Missing parameters: ${missingParams}`],
            });
        }
        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        if (!this.definition) {
            throw new Error(`Undefined function ${this.name}`);
        }
        const scope = new FunctionContext(context);
        for (const arg of this.args) {
            const defined = this.definition!.parameters[this.args.indexOf(arg)];
            const value = arg.evaluate(context);
            scope.setData(defined!.name, value);
        }

        if (this.definition.lines && this.definition.lines.length > 0) {
            for (const line of this.definition.lines) {
                const effect = line.execute(scope);
                if (effect.exception) {
                    scope.addException(effect.exception, { function: this.name });
                    break;
                }
                // console.debug(`Executed line in function ${this.name} with effect:`, effect);
                // console.debug(`Current scope after executing line in function ${this.name}:`, scope.getOutput());
            }
        }
        // const result = this.definition.expression.evaluate(scope);
        // console.debug(`Evaluated function ${this.name} with arguments ${this.args.map(arg => arg.toString()).join(', ')} to result: ${result}`);
        // return result;
        return this.definition.expression.evaluate(scope);
    }
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
        if (key in this.variables) {
            return this.variables[key];
        } else if (this.parent) {
            return this.parent.getData(key);
        } else {
            throw new Error(`Undefined variable: ${key}`);
        }
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
