import { ScopeContext, ScopeTypeChecker } from "../../engine/scope.memory";
import type { ArrayType, AtomicType, ObjectArrayType, ObjectType, PropertyType, TypeChecker, TypedParameter, ValidationResult, WorkingContext } from "../../types";
import { getPathValue, getReturnType, isArrayType, isAtomicType, makeArrayType, makeItemType, mergeValidationResults, pathExists } from "../../utils";
import type { Expression } from "../expression";
import { FunctionExpression } from "../function.expression";
import { LambdaExpression } from "../lambda.expression";
import type { VariableExpression } from "../variable.expression";

export class ArrayLambdaFunction extends FunctionExpression {

    protected name: string;

    protected target_arg: VariableExpression;

    protected lambda_arg: LambdaExpression;

    protected localChecker?: ScopeTypeChecker;

    public constructor(name: string, args: Expression[]) {
        super(name, args);
        this.name = name;
        this.target_arg = args[0] as VariableExpression;
        this.lambda_arg = args[1] as LambdaExpression;
    }

    protected getLocalChecker(checker?: TypeChecker): ScopeTypeChecker {
        if (!this.localChecker) {
            this.localChecker = new ScopeTypeChecker(checker);

            const arrayType = getReturnType(this.target_arg, checker);
            if ((arrayType as ObjectArrayType) && (arrayType as ObjectArrayType).items) {
                this.localChecker.setType(this.lambda_arg.getVariableName(), (arrayType as ObjectArrayType).items);
            } else {
                const itemType = (arrayType as ArrayType).endsWith('[]') ? (arrayType as ArrayType).slice(0, -2) as AtomicType : {} as ObjectType;
                if (itemType) {
                    this.localChecker.setType(this.lambda_arg.getVariableName(), itemType);
                }
            }
        }
        return this.localChecker;
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

    public returnsType(checker?: TypeChecker): AtomicType | ArrayType | ObjectArrayType {
        this.localChecker = this.getLocalChecker(checker);

        switch (this.name) {
            case 'every':
            case 'any':
                return 'boolean';
            case 'filter':
                return getReturnType(this.target_arg, checker) as ArrayType | ObjectArrayType;
            case 'map':
                const lambdaReturnType = getReturnType(this.lambda_arg, this.localChecker);
                if (!lambdaReturnType) {
                    throw new Error(`Unable to determine return type of lambda argument in function ${this.name}`);
                }
                return makeArrayType(lambdaReturnType);
            default:
                throw new Error(`Unknown lambda function: ${this.name}`);
        }
    }

    public checkTypes(checker?: TypeChecker): ValidationResult {
        if (!checker || !checker.strictSyntax()) {
            return { valid: true };
        }

        this.localChecker = this.getLocalChecker(checker);

        const checks: ValidationResult[] = [];
        checks.push(this.target_arg.checkTypes(checker));

        const lambdaReturns = getReturnType(this.lambda_arg, this.localChecker);

        switch (this.name) {
            case 'every':
            case 'any':
                if (lambdaReturns && lambdaReturns !== 'boolean') {
                    checks.push({
                        valid: false,
                        errors: [`Lambda expression in ${this.name} must return boolean, but got ${lambdaReturns}`],
                    });
                }
                break;
            case 'map':
            case 'filter':
                if (!lambdaReturns) {
                    checks.push({
                        valid: false,
                        errors: [`Unable to determine return type of lambda argument in function ${this.name}`],
                    });
                }
                break;
            default:
                checks.push({
                    valid: false,
                    errors: [`Unknown lambda function: ${this.name}`],
                });
        }

        checks.push(this.lambda_arg.checkTypes(this.localChecker));
        return mergeValidationResults(...checks);
    }

    public evaluate(context: WorkingContext): any {
        const targetArray = this.target_arg.evaluate(context);

        if (!Array.isArray(targetArray)) {
            throw new Error(`First argument to ${this.name} must evaluate to an array, but got ${typeof targetArray}`);
        }
        if (!(this.lambda_arg instanceof LambdaExpression)) {
            throw new Error(`Second argument to ${this.name} must be a lambda expression`);
        }

        // Run the lambda expression for each item in the array and collect the results
        const values = targetArray.map((item: any) => {
            const scope = new ScopeContext(context);
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
