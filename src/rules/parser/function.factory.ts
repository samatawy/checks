import type { DateExpression, Expression, NumericExpression, StringExpression } from "../syntax/expression";
import type { FunctionExpression } from "../syntax/function.expression";
import { DateTimeComparisonFunction } from "../syntax/functions/datetime.comparison.functions";
import { DateTimeInspectionFunction } from "../syntax/functions/datetime.inspection.functions";
import { DateTimeManipulationFunction } from "../syntax/functions/datetime.manipulation.functions";
import { ConstantDates, ConstantNumbers } from "../syntax/functions/constant.functions";
import { NumericComparisonFunction } from "../syntax/functions/numeric.comparison.functions";
import { NumericManipulationFunction } from "../syntax/functions/numeric.manipulation.functions";
import { TrigonomicFunction } from "../syntax/functions/numeric.trigonometric.functions";
import { StringComparisonFunction } from "../syntax/functions/string.comparison.functions";
import { StringInspectionFunction } from "../syntax/functions/string.inspection.functions";
import { StringManipulationFunction } from "../syntax/functions/string.manipulation.functions";

/**
 * Factory class for creating FunctionExpression instances based on function name and arguments.
 * You should normally not need to use this factory directly, 
 * as it is primarily used internally by the ExpressionParser when parsing function calls from rule syntax.
 * This factory centralizes the logic for mapping function names to their corresponding FunctionExpression classes,
 * and ensures that the correct types of arguments are passed to each function based on its expected signature.
 * It also provides a single point of maintenance for adding new functions in the future, 
 * as new functions can simply be added to this factory without needing to modify the parsing logic elsewhere in the codebase.   
 */
export class FunctionFactory {

    public static create(name: string, args: Expression[]): FunctionExpression {

        // Constants
        if (ConstantNumbers.names.includes(name)) {
            return new ConstantNumbers(name);
        }
        if (ConstantDates.names.includes(name)) {
            return new ConstantDates(name);
        }

        // Numeric functions
        if (NumericManipulationFunction.names.includes(name)) {
            return new NumericManipulationFunction(name, args[0] as NumericExpression, args.slice(1));
        }
        if (NumericComparisonFunction.names.includes(name)) {
            return new NumericComparisonFunction(name, args[0] as NumericExpression, [args[1] as Expression]);
        }
        if (TrigonomicFunction.names.includes(name)) {
            return new TrigonomicFunction(name, args[0] as NumericExpression, []);
        }

        // String functions
        if (StringManipulationFunction.names.includes(name)) {
            return new StringManipulationFunction(name, args[0] as StringExpression, args.slice(1));
        }
        if (StringComparisonFunction.names.includes(name)) {
            return new StringComparisonFunction(name, args[0] as StringExpression, args[1] as StringExpression);
        }
        if (StringInspectionFunction.names.includes(name)) {
            return new StringInspectionFunction(name, args[0] as StringExpression, []);
        }

        // DateTime functions
        if (DateTimeManipulationFunction.names.includes(name)) {
            return new DateTimeManipulationFunction(name, args[0] as DateExpression, args.slice(1));
        }
        if (DateTimeComparisonFunction.names.includes(name)) {
            return new DateTimeComparisonFunction(name, args[0] as DateExpression, args[1] as DateExpression);
        }
        if (DateTimeInspectionFunction.names.includes(name)) {
            return new DateTimeInspectionFunction(name, args[0] as DateExpression, []);
        }

        throw new Error(`Unknown function: "${name}()"`);
    }

}