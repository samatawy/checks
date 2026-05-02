import type { AbstractRule } from "../rules/abstract.rule";
import type { WorkSpaceOptions } from "./work.space";

/**
 * The RuleMemory class is responsible for storing all rules in the workspace and managing their salience and potential conflicts. 
 * It provides methods to add, retrieve, list, and clear rules, as well as to sort them based on their salience. 
 * If strict conflict resolution is enabled, it also checks for potential conflicts where multiple rules change the same output key 
 * and resolves them by keeping only the rule with the highest salience.
 */
export class RuleMemory {

    private rules: AbstractRule[];
    private options: WorkSpaceOptions;

    /**
     * Create a new RuleMemory instance.
     * You should normally not need to create a RuleMemory directly, as it is managed by the WorkSpace.
     * @param options Optional configuration settings for the rule memory.
     */
    constructor(options?: Partial<WorkSpaceOptions>) {
        this.rules = [];

        this.options = {
            debugging: false,
            strict_conflicts: false,
            strict_syntax: true,      // Ignored here
            strict_inputs: false,    // Ignored here
            strict_outputs: false,   // Ignored here
            max_iterations: 100,    // Ignored here
            ...options
        };
    }

    /**
     * Add a rule to the memory.
     * @param rule the rule to be added to the memory.
     */
    public addRule(rule: AbstractRule): void {
        this.rules.push(rule);
    }

    /**
     * Add multiple rules to the memory.
     * @param rules the rules to be added to the memory.
     */
    public addRules(rules: AbstractRule[]): void {
        for (const rule of rules) {
            this.addRule(rule);
        }
    }

    /**
     * Find a rule by its name.
     * @param name the name of the rule to find.
     * @returns the rule with the given name, or undefined if no such rule exists in the memory.
     */
    public getRule(name: string): AbstractRule | undefined {
        return this.rules.find(r => r.name === name);
    }

    /**
     * List all rules currently stored in the memory.
     * @returns an unsorted array of all rules in the memory.
     */
    public getRules(): AbstractRule[] {
        return this.rules;
    }

    /**
     * Clear all rules from the memory.
     */
    public clear(): void {
        this.rules = [];
    }

    protected preventConflicts(rules: AbstractRule[]): AbstractRule[] {
        this.debug(`Checking for potential conflicts among ${rules.length} applicable rules...`);

        // Detect potential conflicts where multiple rules change the same output key
        const effects: any = {};
        const distinctRules: AbstractRule[] = [];

        for (const rule of rules) {
            const changes = rule.typedChanges();
            for (const [key, type] of Object.entries(changes)) {
                if (!effects[key]) {
                    effects[key] = {};
                }
                const salience = rule.getSalience();
                effects[key]['' + salience] = effects[key]['' + salience] || [];
                effects[key]['' + salience].push(rule);
            }
        }
        this.debug('Effects grouped by changed output key and salience:', effects);

        for (const change in effects) {
            const saliences = Object.keys(effects[change]).map(s => parseInt(s));
            const maxSalience = Math.max(...saliences);
            const effectiveRules = effects[change]['' + maxSalience];
            this.debug(`For output key "${change}", found ${effectiveRules.length} rules with saliences: ${saliences.join(', ')}. Max salience: ${maxSalience}`);
            // If more than one rule has the highest salience, throw an error to prevent non-deterministic behavior
            if (effectiveRules.length > 1) {
                const conflictingRules = effectiveRules.map((r: AbstractRule) => r.toString()).join(', ');
                throw new Error(`Conflict detected: Multiple rules with salience ${maxSalience} change the same output key "${change}". Conflicting rules: ${conflictingRules}`);
            } else {
                distinctRules.push(...effectiveRules);
            }
        }
        this.debug(`Conflict check completed. ${distinctRules.length} distinct rules after resolving conflicts.`);
        return distinctRules;
    }

    /**
     * Sort the given rules based on their salience.
     * If strict conflict resolution is enabled, conflicts are checked and resolved before sorting.
     * @param rules an array of rules to be sorted.
     * @returns a sorted array of rules, with higher salience rules appearing first.
     */
    public sortRules(rules: AbstractRule[]): AbstractRule[] {
        if (this.options.strict_conflicts) {
            return this.preventConflicts(rules);
        } else {
            return rules.sort((a, b) => b.getSalience() - a.getSalience());
        }
    }

    protected debug(...args: any[]): void {
        if (this.options.debugging) {
            console.log('[RuleMemory DEBUG]', ...args);
        }
    }
}