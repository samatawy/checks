import { OutputAction, type ExecutableAction } from "../executable";
import { ExpressionParser } from "./expression.parser";

export class ExecutableParser {
    private expressionParser: ExpressionParser;

    constructor() {
        this.expressionParser = new ExpressionParser();
    }

    public parse(syntax: string): ExecutableAction | null {

        // If this is an assignment with SET, parse it as such
        // This allows for syntax like "SET x.y = 10"
        if (syntax.match(/^SET\s+/i)) {
            return this.parseStateAssignment(syntax);
        }
        else if (syntax.match(/^\w+(\.\w+)*\s*=\s*.+$/i)) {
            // otherwise handle a simple assignment without SET, like "x.y = 10"
            return this.parseAssignment(syntax);
        }
        throw new Error(`Unrecognized executable syntax: ${syntax}`);
    }

    protected parseStateAssignment(syntax: string): ExecutableAction | null {
        // This accepts a state assignment like "SET x = 10"
        const match = syntax.match(/^SET\s+(\w+(\.\w+)*)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[3]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);

            return new OutputAction(variableName, valueExpr);
        }
        return null;
    }

    protected parseAssignment(syntax: string): ExecutableAction | null {
        // This accepts a simple assignment without SET, like "x.y = 10"
        const match = syntax.match(/^(\w+(\.\w+)*)\s*=\s*(.+)$/i);
        if (match) {
            const variableName = match[1]!;
            const valueSyntax = match[3]!;
            const valueExpr = this.expressionParser.parse(valueSyntax);

            return new OutputAction(variableName, valueExpr);
        }
        return null;
    }
}