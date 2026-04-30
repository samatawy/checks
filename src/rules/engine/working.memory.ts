import { Exception } from "../exception";
import { cloneDeep, getPathValue, pathExists } from "../utils";
import type { RuleEffect, WorkingContext } from "../types";
import type { WorkSpace } from "./work.space";
import type { AbstractRule } from "../rules/abstract.rule";

export interface LoggedRule {
    rule: AbstractRule;
    effect: RuleEffect;
}


export class WorkingMemory implements WorkingContext {

    private workspace: WorkSpace;

    private input: any;

    private exceptions: Exception[];

    private output: any;

    private logged: LoggedRule[];

    constructor(data: any, workspace: WorkSpace) {
        this.input = data === undefined ? {} : data;
        this.workspace = workspace;

        this.exceptions = [];
        this.output = cloneDeep(this.input);
        this.logged = [];
    }

    public hasConstant(key: string): boolean {
        return this.workspace.hasConstant(key);
    }

    public getConstant(key: string) {
        return this.workspace.getConstant(key);
    }

    private hasInput(key: string): boolean {
        return pathExists(this.input, key);
    }

    private getInput(key: string): any {
        return getPathValue(this.input, key);
    }

    public hasData(key: string): boolean {
        return pathExists(this.output, key);
    }

    public getData(key: string): any {
        return getPathValue(this.output, key);
    }

    public rootKeys(): string[] {
        const keys = new Set<string>();
        for (const key of Object.keys(this.output)) {
            keys.add(key);
        }
        return Array.from(keys);
    }

    public addException(message: string, context: any): void {
        this.exceptions.push(new Exception(message, context));
    }

    public getExceptions(): Exception[] {
        return this.exceptions;
    }

    public addToLog(rule: AbstractRule, effect: RuleEffect): void {
        this.logged.push({ rule, effect });
    }

    public clearLog(): void {
        this.logged = [];
    }

    public getLog(): LoggedRule[] {
        return new Array(...this.logged);
    }

    public setOutput(key: string, value: any): void {
        if (key.includes('.')) {
            // if the key is a nested path, we need to traverse the output object to set the value at the correct path
            const parts = key.split('.');
            let current = this.output;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i]!;
                const target = current[part];
                if (Array.isArray(target)) {
                    // cannot handle arrays yet, throw error if we encounter an array in the path
                    throw new Error(`Cannot set output for key: ${key} because ${part} is an array`);
                }
                else if (target != null && typeof target === 'object') {
                    current = target;
                } else if (target != null && typeof current[part] !== 'object') {
                    // cannot set output for key if the path already exists but is not an object
                    throw new Error(`Cannot set output for key: ${key} because ${part} is not an object`);
                } else if (target == null) {
                    // if the path does not exist, create an empty object at that path
                    current[part] = {};
                    current = current[part];
                } else {
                    current = target;
                }
            }
            current[parts[parts.length - 1]!] = value;
        } else {
            // if the key is a simple key, we can set the value directly on the output object
            this.output[key] = value;
        }
    }

    public getOutput(key?: string): any {
        if (key === undefined) {
            return this.output;
        }
        return getPathValue(this.output, key);
    }
}