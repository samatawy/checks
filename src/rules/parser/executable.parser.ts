import type { FunctionMemory } from "../engine/function.memory";
import type { WorkSpace } from "../engine/work.space";
import { CompositeAction, OutputAction, type ExecutableAction } from "../executable";
import { ExpressionParser } from "./expression.parser";
import type { ParserOptions } from "./rule.parser";

/**
 * Parser class for parsing executable actions from rule syntax. 
 * You should normally not need to use this parser directly, as it is primarily used internally 
 * by the RuleParser when parsing consequences from rule syntax.
 * This includes parsing state assignments (e.g. "SET x = 10") and simple assignments (e.g. "x = 10") 
 * into OutputAction instances that can be executed within the rule engine.
 */
export class ExecutableParser {

    private options: ParserOptions;

    private expressionParser: ExpressionParser;

    constructor(options: ParserOptions) {
        this.options = options;
        this.expressionParser = new ExpressionParser(this.options);
    }

    /**
     * Parse a string representing an executable action into an ExecutableAction object.
     * @param syntax The string representation of the executable action to parse.
     * @returns An ExecutableAction object representing the parsed action if successful.
     * @throws An error if the syntax is unrecognized or invalid.
     */
    public parse(syntax: string): ExecutableAction | null {

        if (syntax.includes(';')) {
            // This allows for multiple actions separated by semicolons, like "SET x = 10; y = 20"
            const actionSyntaxes = syntax.split(';').map(s => s.trim());

            // Parse each action syntax into an ExecutableAction
            const actions = actionSyntaxes.map(s => this.parse(s))
                .filter(a => a !== null) as ExecutableAction[];

            // and combine them into a CompositeAction that executes all of them together
            if (actions.length === actionSyntaxes.length) {
                return new CompositeAction(actions);
            } else {
                throw new Error(`Failed to parse one or more actions in composite syntax: ${syntax}`);
            }
        }

        let action: ExecutableAction | null = null;
        // If this is an assignment with SET, parse it as such
        // This allows for syntax like "SET x.y = 10"
        if (syntax.match(/^SET\s+/i)) {
            action = this.parseStateAssignment(syntax);
        }
        else if (syntax.match(/^\w+(\.\w+)*\s*=\s*.+$/i)) {
            // otherwise handle a simple assignment without SET, like "x.y = 10"
            action = this.parseAssignment(syntax);
        }
        if (action) {
            return action;
        } else {
            throw new Error(`Unrecognized executable syntax: ${syntax}`);
        }
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