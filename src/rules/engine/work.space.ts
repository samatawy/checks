import type { AbstractRule } from "../rules/abstract.rule";
import { pathExists } from "../utils";
import type { RuleContext } from "../types";
import { WorkingMemory } from "./working.memory";
import { RuleGraph } from "../graph/rule.graph";
import { RuleNode, type AbstractNode } from "../graph/nodes";
import { RuleParser } from "../parser/rule.parser";

export class WorkSpace {    // could implement Evaluator but no need for ambiguity

    rules: AbstractRule[];

    graph: RuleGraph;

    constants: any;

    constructor() {
        this.rules = [];
        this.graph = new RuleGraph();
        this.constants = {};
    }

    public addConstants(constants: any): void {
        this.constants = { ...this.constants, ...constants };
    }

    public addConstant(key: string, value: any): void {
        this.constants[key] = value;
    }

    public getConstant(key: string): any {
        return this.constants[key];
    }

    public hasConstant(key: string): boolean {
        return pathExists(this.constants, key);
    }

    public addRule(rule: string | AbstractRule): void {
        if (typeof rule === 'string') try {
            rule = new RuleParser().parse(rule) as AbstractRule;
        } catch (e) {
            throw new Error(`Failed to parse rule: ${rule}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        this.rules.push(rule);
        this.graph.addRule(rule);
    }

    public getRules(): AbstractRule[] {
        return this.rules;
    }

    public loadContext(data: any): WorkingMemory {
        return new WorkingMemory(data, this);
    }

    public applicableRules(context: RuleContext): AbstractRule[] {
        // TODO: Optimize this
        // return this.rules.filter(rule => rule.applicable(context));

        let applicable = new Set<AbstractRule>();

        for (let key of context.rootKeys()) {
            // console.debug('Looking for applicable rules for key:', key);
            // console.debug('Context root keys:', context.rootKeys());
            const root = this.graph.findRoot(key);
            if (!root) {
                // console.debug('No root found for key:', key);
                continue;
            }
            if (root) {
                // console.debug('Found root for key:', key, ' root:', root);

                let currentContext = context.getData(key);
                // console.debug('Nested context for key:', key, ' is:', currentContext);
                let currentNode: AbstractNode = root;

                while (currentContext) {
                    if (currentNode instanceof RuleNode) {
                        applicable.add(currentNode.rule);
                    }
                    for (const child of currentNode.children) {
                        if (child instanceof RuleNode) {
                            applicable.add(child.rule);
                        }
                    }
                    const childKeys = Object.keys(currentContext);
                    if (childKeys.length === 0) {
                        break;
                    }
                    // console.debug('Current context keys:', childKeys);

                    for (const childKey of Object.keys(currentContext)) {
                        const childNode = currentNode.findChild(childKey);
                        if (childNode) {
                            currentNode = childNode;
                            currentContext = currentContext[childKey];
                        } else {
                            currentContext = null;
                        }
                    }
                }
            }
        }

        let checked: AbstractRule[] = Array.from(applicable).filter(rule => rule.applicable(context));
        return checked;
    }

    public evaluate(context: WorkingMemory): any {
        const applicable = this.applicableRules(context);
        if (applicable.length === 0) {
            return;
        }
        for (const rule of applicable) {
            // console.debug('Evaluating rule:', rule.toString(), ' with context:', context);
            rule.evaluate(context);
        }
        // console.debug('Final context after evaluation:', context);
        return context.getOutput();
    }
}