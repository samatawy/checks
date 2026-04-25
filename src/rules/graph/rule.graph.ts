import type { AbstractRule } from "../rules/abstract.rule";
import { AbstractNode, CombinationNode, DataNode, RuleNode } from "./nodes";

export class RuleGraph {

    roots: AbstractNode[];

    constructor() {
        this.roots = [];
    }

    protected addRoot(node: AbstractNode): void {
        this.roots.push(node);
    }

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