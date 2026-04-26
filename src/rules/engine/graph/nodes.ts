import type { AbstractRule } from "../../rules/abstract.rule";

/**
 * AbstractNode represents a node in the rule graph. It can be a DataNode, a CombinationNode, or a RuleNode.
 * Each node can have multiple parents and children, representing the dependencies between rules and data keys.
 */
export abstract class AbstractNode {

    public parents: AbstractNode[];

    public children: AbstractNode[];

    constructor() {
        this.parents = [];
        this.children = [];
        // this.rules = [];
    }

    public addChild(node: AbstractNode): void {
        this.children.push(node);
        node.parents.push(this);
    }

    public findChild(key: string): AbstractNode | undefined {
        return this.children.find(child => child instanceof DataNode && child.key === key);
    }
}

/**
 * DataNode represents a node that corresponds to a specific data key in the rule graph.
 * It holds a key and can have child nodes that represent nested data, rules, or combinations that depend on this data key.
 */
export class DataNode extends AbstractNode {

    public key: string;

    constructor(key: string) {
        super();
        this.key = key;
    }
}

/**
 * CombinationNode represents a logical combination of parents into one branch, using AND. 
 * It does not have a key but can hold child rules that have multiple requirements.
 */
export class CombinationNode extends AbstractNode {

    constructor() {
        super();
    }
}

/**
 * RuleNode represents a node that is directly associated with a rule.
 * It holds a reference to an AbstractRule and can be evaluated within the context of the rule engine.
 */
export class RuleNode extends AbstractNode {

    public rule: AbstractRule;

    constructor(rule: AbstractRule) {
        super();
        this.rule = rule;
    }
}