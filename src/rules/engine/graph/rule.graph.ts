import type { AbstractRule } from "../../rules/abstract.rule";
import { AbstractNode, CombinationNode, DataNode, RuleNode } from "./nodes";

/**
 * The RuleGraph class is responsible for organizing rules based on their required inputs and outputs, 
 * allowing for efficient evaluation and execution of rules in the correct order. 
 * It builds a graph structure where nodes represent data keys or rules, and edges represent dependencies between them.
 */
export class RuleGraph {

    roots: AbstractNode[];

    /**
     * Create a new RuleGraph instance.
     * You should normally not need to create a RuleGraph directly, as it is managed by the WorkSpace. 
     */
    constructor() {
        this.roots = [];
    }

    protected addRoot(node: AbstractNode): void {
        this.roots.push(node);
    }

    /**
     * Find a root node in the graph by its key. Root nodes represent top-level data keys that rules depend on.
     * @param key the key of the root node to find.
     * @returns the root node with the given key, or undefined if no such node exists.
     */
    public findRoot(key: string): DataNode | undefined {
        // console.debug('Looking for root with key:', key, ' in roots:', this.roots);
        return this.roots.find(root => root instanceof DataNode && root.key === key) as DataNode | undefined;
    }

    protected findOrCreateRoot(key: string): DataNode {
        let node = this.findRoot(key);
        if (!node) {
            node = new DataNode(key);
            this.addRoot(node);
        }
        return node;
    }

    protected findOrCreateChild(node: AbstractNode, key: string): AbstractNode {
        let childNode = node.findChild(key);
        if (!childNode) {
            childNode = new DataNode(key);
            node.addChild(childNode);
        }
        return childNode;
    }

    /**
     * Add a rule to the graph based on its required inputs. 
     * The rule is represented as a RuleNode, and it is connected to the nodes representing its required data keys. 
     * If multiple rules require the same data key, they are connected to a common CombinationNode to represent the dependency.
     * @param rule the rule to be added to the graph.
     * @returns void
     */
    public addRule(rule: AbstractRule): void {
        const required = rule.required();
        if (required.size === 0) {
            const root = new RuleNode(rule);
            this.addRoot(root);
            return;
        }

        let parents: AbstractNode[] = [];

        for (const requirement of required) {
            const path = requirement.split(".");
            if (path.length === 0) {
                continue;
            } else if (path.length === 1) {
                const rootNode = this.findOrCreateRoot(requirement);
                parents.push(rootNode);
            } else {
                const rootKey = path[0]!;
                const rootNode = this.findOrCreateRoot(rootKey);
                let remaining = path.slice(1);
                let currentNode: AbstractNode = rootNode;

                for (const key of remaining) {
                    let childNode = this.findOrCreateChild(currentNode, key);
                    currentNode = childNode;
                }
                parents.push(currentNode);
            }
        }

        if (parents.length === 1) {
            const ruleNode = new RuleNode(rule);
            parents[0]?.addChild(ruleNode);
        } else {
            const combinationNode = new CombinationNode();
            for (const parent of parents) {
                parent.addChild(combinationNode);
            }
            const ruleNode = new RuleNode(rule);
            combinationNode.addChild(ruleNode);
        }
    }
}