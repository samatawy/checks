import { AbstractRule } from "../rules/abstract.rule";
import { pathExists } from "../utils";
import type { Executor, WorkingContext } from "../types";
import { WorkingMemory } from "./working.memory";
import { RuleGraph } from "./graph/rule.graph";
import { RuleNode, type AbstractNode } from "./graph/nodes";
import { RuleParser } from "../parser/rule.parser";
import { RuleMemory } from "./rule.memory";

/**
 * Options for configuring the behavior of the WorkSpace, including debugging, conflict resolution, and iteration limits.
 */
export interface WorkSpaceOptions {
    /**
     * Enable or disable debugging output. 
     * When true, the workspace will log detailed information about rule evaluation and execution processes, which can be helpful for development and troubleshooting.
     */
    debugging: boolean;

    /**
     * Enable or disable strict conflict resolution. 
     * When true, the workspace will enforce strict rules for resolving conflicts between competing rules, potentially throwing errors if conflicts are detected.
     */
    strict_conflicts: boolean;

    /**
     * The maximum number of iterations the workspace will perform when evaluating rules.
     * This helps prevent infinite loops in rule evaluation.
     */
    max_iterations: number;
}

/**
 * The WorkSpace class serves as the central hub for managing rules, constants, and their evaluation.
 * It maintains a collection of rules, a graph structure for efficient rule retrieval, and a set of constants that can be used in rule evaluation.
 * The workspace provides methods for adding rules and constants, loading contexts for evaluation, and processing rules against given data.
 */
export class WorkSpace {

    protected rules: RuleMemory;

    protected graph: RuleGraph;

    protected constants: any;

    protected options: WorkSpaceOptions;

    /**
     * Create a new WorkSpace instance, the starting point for managing rules, constants, and their evaluation.
     * @param options Optional configuration settings for the workspace.
     */
    constructor(options?: Partial<WorkSpaceOptions>) {
        this.rules = new RuleMemory(options);
        this.graph = new RuleGraph();
        this.constants = {};
        this.options = {
            debugging: false,
            strict_conflicts: false,
            max_iterations: 100,
            ...options
        };
    }

    /**
     * Add multiple constants to the workspace. 
     * Constants are key-value pairs that can be used in rule evaluation and are accessible across all rules.
     * @param constants a json object containing constant names as keys and their corresponding values.
     */
    public addConstants(constants: any): void {
        this.constants = { ...this.constants, ...constants };
    }

    /**
     * Add a single constant to the workspace.
     * @param key the name of the constant.
     * @param value the value of the constant.
     */
    public addConstant(key: string, value: any): void {
        this.constants[key] = value;
    }

    /**
     * Get the value of a constant by its name.
     * @param key the name of the constant.
     * @returns the value of the constant, or undefined if the constant does not exist.
     */
    public getConstant(key: string): any {
        return this.constants[key];
    }

    /**
     * Check if a constant exists in the workspace.
     * @param key the name of the constant.
     * @returns true if the constant exists, false otherwise.
     */
    public hasConstant(key: string): boolean {
        return pathExists(this.constants, key);
    }

    /**
     * Add a rule to the workspace. 
     * The rule can be provided as a string containing the rule syntax, or as an already created AbstractRule instance.
     * If a string is provided, it will be parsed into an AbstractRule using the RuleParser.
     * @param rule a created rule, or rule syntax containing annotations
     * @param salience the optional priority of the rule, higher values indicate higher priority. Defaults to 0.
     */
    public addRule(rule: string | AbstractRule, salience?: number): void {
        if (typeof rule === 'string') try {
            rule = new RuleParser().parse(rule) as AbstractRule;
        } catch (e) {
            throw new Error(`Failed to parse rule: ${rule}. Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (salience !== undefined) {
            rule.setSalience(salience);
        }
        this.rules.addRule(rule);
        this.graph.addRule(rule);
    }

    /**
     * Find a rule by its name.
     * @param name the name of the rule to find.
     * @returns the rule with the given name, or undefined if no such rule exists in the workspace.
     */
    public getRule(name: string): AbstractRule | undefined {
        return this.rules.getRule(name);
    }

    /**
     * List all rules currently stored in the workspace.
     * @returns an unsorted array of all rules in the workspace.
     */
    public getRules(): AbstractRule[] {
        return this.rules.getRules();
    }

    /**
     * Clear all rules from the workspace.
     * This will effectively create a new rule graph and remove all existing rules.
     */
    public clearRules(): void {
        this.rules.clear();
        this.graph = new RuleGraph();
    }

    /**
     * Debugging method to get the current rule graph.
     * @returns the current RuleGraph instance representing rules and their dependencies in the workspace.
     */
    public getGraph(): RuleGraph {
        return this.graph;
    }

    /**
     * Create a working memory to wrap input data and hold outputs and exceptions during rule evaluation. 
     * The working memory serves as the context in which rules are evaluated and executed.
     * @param data Any input data that needs to be evaluated.
     * @returns a new instance of WorkingMemory initialized with the given data and the current workspace.
     */
    public loadContext(data: any): WorkingMemory {
        return new WorkingMemory(data, this);
    }

    /**
     * Get all rules that are applicable to the given context. 
     * This is done by traversing the rule graph starting from the root nodes that match the keys in the context, 
     * and collecting all rules that are reachable and applicable based on their requirements.
     * @param context the working memory context that contains the current state of data.
     * @returns an array of applicable rules that can be evaluated against the given context.
     */
    public applicableRules(context: WorkingContext): AbstractRule[] {

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

    /**
     * Evaluate relevant rules against the given context, and execute their consequences. 
     * This process is iterative and continues until no new rules become applicable 
     * or a maximum iteration limit is reached to prevent infinite loops.
     * In each iteration, all currently applicable rules are evaluated and their executors are collected.
     * Then, all executors are executed in a batch.
     * @param context the working memory context that contains the current state of data.
     * @returns the final output after processing all applicable rules.
     */
    public process(context: WorkingMemory): any {
        let applicable = this.applicableRules(context);
        let iterate = (applicable.length > 0), iteration = 0;
        let executors: Executor[] = [];
        const maxIterations = this.options.max_iterations;

        while (iterate && iteration < maxIterations) {
            this.debug(`Iteration ${iteration + 1}: Applicable rules:`, applicable.length);

            iteration++;
            iterate = false;
            executors = [];

            // Evaluate all applicable rules and collect their executors
            const sorted = this.rules.sortRules(applicable);
            for (const rule of sorted) {
                this.debug('Evaluating rule:', rule.toString());
                const executor = rule.evaluate(context);
                if (executor) {
                    executors.push(executor);
                }
            }

            // Execute all collected executors and track if any outputs were changed
            for (const executor of executors) {
                const effect = executor.execute(context);
                if (effect.changed) {
                    this.debug(`Executor changed output key: ${effect.changed} to value: ${context.getOutput(effect.changed)}`);
                    iterate = true;
                }
            }

            // If any executors changed outputs, we need to check if new rules have become applicable
            if (iterate) {
                const lastApplicable = applicable;
                const nextApplicable = this.applicableRules(context);
                iterate = nextApplicable.map(rule => !lastApplicable.includes(rule)).some(changed => changed);

                if (iterate) {
                    applicable = nextApplicable;
                }
            }
        }

        // After processing, optionally log results
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

    // Legacy code that evaluates and executes rules in a non-batch manner, 
    // which could lead to non-deterministic behavior if multiple rules change the same output key.
    // public evaluate(context: WorkingMemory): any {
    //     let applicable = this.applicableRules(context);
    //     let iterate = (applicable.length > 0), iteration = 0;
    //     const maxIterations = this.options.max_iterations;

    //     while (iterate && iteration < maxIterations) {
    //         this.debug(`Iteration ${iteration + 1}: Applicable rules:`, applicable.length);

    //         iteration++;
    //         iterate = false;

    //         for (const rule of applicable) {
    //             this.debug('Evaluating rule:', rule.toString());
    //             const effect = rule.evaluate(context);
    //             if (effect.changed) {
    //                 this.debug(`Rule ${rule.toString()} changed output key: ${effect.changed} to value: ${context.getOutput(effect.changed)}`);
    //                 iterate = true;
    //             }
    //         }

    //         if (iterate) {
    //             const lastApplicable = applicable;
    //             const nextApplicable = this.applicableRules(context);
    //             iterate = nextApplicable.map(rule => !lastApplicable.includes(rule)).some(changed => changed);

    //             if (iterate) {
    //                 applicable = nextApplicable;
    //             }
    //         }
    //     }
    //     if (iteration === maxIterations) {
    //         console.warn(`Reached maximum iterations (${maxIterations}) while evaluating rules. There may be a cycle in the rules.`);
    //     } else if (iteration > 1) {
    //         this.debug(`Evaluation completed in ${iteration} iterations.`);
    //     } else {
    //         this.debug(`Evaluation completed in a single iteration.`);
    //     }

    //     this.debug('Final output after evaluation:', context.getOutput());
    //     return context.getOutput();
    // }    

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug(...args);
        }
    }
}