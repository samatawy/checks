import type { FunctionDefinition } from "../types";
import type { WorkSpaceOptions } from "./work.space";

export class FunctionMemory {

    private functions: Map<string, FunctionDefinition>;

    protected options: WorkSpaceOptions;

    constructor(options?: Partial<WorkSpaceOptions>) {
        this.functions = new Map<string, FunctionDefinition>();

        this.options = {
            debugging: false,
            strict_conflicts: false,    // Ignored here
            strict_inputs: false,   // Ignored here
            strict_outputs: false,   // Ignored here
            max_iterations: 100,      // Ignored here
            ...options
        };
    }

    public strictInputs(): boolean {
        return this.options.strict_inputs;
    }

    public strictOutputs(): boolean {
        return this.options.strict_outputs;
    }

    public hasFunction(name: string): boolean {
        return this.functions.has(name);
    }

    public getFunction(name: string): FunctionDefinition | undefined {
        return this.functions.get(name);
    }

    public addFunction(func: FunctionDefinition): void {
        this.functions.set(func.name, func);
    }

    public addFunctions(funcs: Map<string, FunctionDefinition> | Record<string, FunctionDefinition> | FunctionDefinition[]): void {
        if (funcs instanceof Map) {
            for (const func of funcs.values()) {
                this.addFunction(func);
            }
        } else if (Array.isArray(funcs)) {
            for (const func of funcs) {
                this.addFunction(func);
            }
        } else {
            for (const func of Object.values(funcs)) {
                this.addFunction(func);
            }
        }
    }

    public clear(): void {
        this.functions.clear();
    }

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug('[FunctionMemory DEBUG]', ...args);
        }
    }
}