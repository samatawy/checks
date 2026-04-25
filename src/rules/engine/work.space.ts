import type { AbstractRule } from "../rules/abstract.rule";
import { pathExists } from "../utils";
import type { RuleContext } from "../types";
import { WorkingMemory } from "./working.memory";
import { RuleGraph } from "../graph/rule.graph";
import { RuleNode, type AbstractNode } from "../graph/nodes";
import { RuleParser } from "../parser/rule.parser";

export interface WorkSpaceOptions {
    debugging: boolean;
    max_iterations: number;
}

export class WorkSpace {    // could implement Evaluator but no need for ambiguity

    rules: AbstractRule[];

    graph: RuleGraph;

    constants: any;

    options: WorkSpaceOptions;

    constructor(options?: Partial<WorkSpaceOptions>) {
        this.rules = [];
        this.graph = new RuleGraph();
        this.constants = {};
        this.options = {
            debugging: false,
            max_iterations: 100,
            ...options
        };
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

    public clearRules(): void {
        this.rules = [];
        this.graph = new RuleGraph();
    }

    public loadContext(data: any): WorkingMemory {
        return new WorkingMemory(data, this);
    }

    public applicableRules(context: RuleContext): AbstractRule[] {

        let applicable = new Set<AbstractRule>();

        for (let key of context.rootKeys()) {
            const root = this.graph.findRoot(key);
            if (!root) {
                this.debug('No root found for key:', key);
                continue;
            }
            if (root) {
                let currentContext = context.getData(key);
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
        let applicable = this.applicableRules(context);
        let iterate = (applicable.length > 0), iteration = 0;
        const maxIterations = this.options.max_iterations;

        while (iterate && iteration < maxIterations) {
            this.debug(`Iteration ${iteration + 1}: Applicable rules:`, applicable.length);

            iteration++;
            iterate = false;

            for (const rule of applicable) {
                this.debug('Evaluating rule:', rule.toString());
                const effect = rule.evaluate(context);
                if (effect.changed) {
                    this.debug(`Rule ${rule.toString()} changed output key: ${effect.changed} to value: ${context.getOutput(effect.changed)}`);
                    iterate = true;
                }
            }

            if (iterate) {
                const lastApplicable = applicable;
                const nextApplicable = this.applicableRules(context);
                iterate = nextApplicable.map(rule => !lastApplicable.includes(rule)).some(changed => changed);

                if (iterate) {
                    applicable = nextApplicable;
                }
            }
        }
        if (iteration === maxIterations) {
            console.warn(`Reached maximum iterations (${maxIterations}) while evaluating rules. There may be a cycle in the rules.`);
        } else if (iteration > 1) {
            this.debug(`Evaluation completed in ${iteration} iterations.`);
        } else {
            this.debug(`Evaluation completed in a single iteration.`);
        }

        this.debug('Final output after evaluation:', context.getOutput());
        return context.getOutput();
    }

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug(...args);
        }
    }
}