import type { FunctionDefinition } from "../types";
import type { WorkSpaceOptions } from "./work.space";

/**
 * FunctionMemory is responsible for storing and managing function definitions within the working context. 
 * It allows adding, retrieving, and checking for the existence of function definitions. 
 * This memory is used during rule evaluation to resolve function calls and validate their usage 
 * against defined function signatures.
 * The FunctionMemory also respects the workspace options for strict input and output validation, 
 * which can be used to enforce type safety and correctness when functions are called within rules and expressions.
 * 
 * TODO: Prevent custom functions from being added with the same name as built-in functions, to avoid conflicts and ensure predictable behavior.
 */
export class FunctionMemory {

    private functions: Map<string, FunctionDefinition>;

    protected options: WorkSpaceOptions;

    /**
     * Create a new instance of FunctionMemory.
     * @param options Optional workspace options to configure the behavior of the function memory.
     */
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

    /**
     * Check if strict input validation is enabled.
     * @returns True if strict input validation is enabled, false otherwise.
     */
    public strictInputs(): boolean {
        return this.options.strict_inputs;
    }

    /**
     * Check if strict output validation is enabled.
     * @returns True if strict output validation is enabled, false otherwise.
     */
    public strictOutputs(): boolean {
        return this.options.strict_outputs;
    }

    /**
     * Check if a function with the given name exists in the memory.
     * @param name The name of the function to check.
     * @returns True if the function exists, false otherwise.
     */
    public hasFunction(name: string): boolean {
        return this.functions.has(name);
    }

    /**
     * Retrieve a function definition by its name.
     * @param name The name of the function to retrieve.
     * @returns The function definition if found, undefined otherwise.
     */
    public getFunction(name: string): FunctionDefinition | undefined {
        return this.functions.get(name);
    }

    /**
     * Add a function definition to the memory.
     * @param func The function definition to add.
     */
    public addFunction(func: FunctionDefinition): void {
        this.functions.set(func.name, func);
    }

    /**
     * Add multiple function definitions to the memory.
     * @param funcs The function definitions to add, can be a Map, Record, or array.
     */
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

    /**
     * Clear all function definitions from the memory.
     */
    public clear(): void {
        this.functions.clear();
    }

    private debug(...args: any[]): void {
        if (this.options.debugging) {
            console.debug('[FunctionMemory DEBUG]', ...args);
        }
    }
}