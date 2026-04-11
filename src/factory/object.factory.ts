import type { IResult, ResultSet, ResultOptions } from '../types';
import { ObjectCheck } from '../checks/object.check';

export type ObjectFactoryClass<T> = {

    new(...args: any[]): T;

    validateInput(input: unknown): ObjectCheck | Promise<ObjectCheck>;

    fromValidInput(input: any): T;
}

export type UpdatableClass<T> = {
    new(...args: any[]): T;

    validateUpdate(oldValue: unknown, newValue: unknown): ObjectCheck | Promise<ObjectCheck>;

    updateFrom(existing: T, input: any): T | Promise<T>;
};

export class ObjectFactory<T> {

    public readonly valid: boolean;

    public readonly instance?: T;

    public readonly check: ObjectCheck;

    private constructor(check: ObjectCheck, instance?: T) {
        this.check = check;
        this.instance = instance;
        this.valid = this.check.result().valid;
    }

    public static async create<T>(input: unknown, type: ObjectFactoryClass<T>): Promise<ObjectFactory<T>> {
        assertObjectFactoryClass<T>(type);

        const check = await type.validateInput(input);
        const result = check.result();

        if (!result.valid) {
            return new ObjectFactory<T>(check);
        }

        const instance = type.fromValidInput(input);
        return new ObjectFactory<T>(check, instance);
    }

    public static async update<T>(existing: T, input: unknown, type: UpdatableClass<T>): Promise<ObjectFactory<T>> {
        assertUpdatableClass<T>(type);

        const check = await type.validateUpdate(existing, input);
        const result = check.result();

        if (!result.valid) {
            return new ObjectFactory<T>(check);
        }

        const instance = await type.updateFrom(existing, input);
        return new ObjectFactory<T>(check, instance);
    }

    public result(options?: ResultOptions): IResult {
        return this.check.result(options);
    }

    private buildErrorMessage(prefix?: string): string {
        const errors = (this.result({ flattened: true }) as ResultSet).errors || [];
        let message = prefix || '';
        if (errors.length > 0) {
            message += ' Input errors: ' + errors.join('; ');
        }
        return message;
    }

    public getInstanceOrThrow(message = 'Validated object instance is not available because input is invalid.'): T {
        if (!this.valid || this.instance === undefined) {
            message = this.buildErrorMessage(message);
            throw new Error(message);
        }

        return this.instance;
    }

    public getInstanceOrErrors(): { instance?: T, errors?: string[] } {
        if (!this.valid || this.instance === undefined) {
            const errors = (this.result({ flattened: true }) as ResultSet).errors || [];
            return { errors };
        }

        return { instance: this.instance };
    }

    public static async createOrThrow<T>(
        input: unknown,
        type: ObjectFactoryClass<T>,
        message = 'Validated object instance is not available because input is invalid.',
    ): Promise<T> {
        const factory = await ObjectFactory.create<T>(input, type);
        return factory.getInstanceOrThrow(message);
    }

    public static async createOrErrors<T>(input: unknown, type: ObjectFactoryClass<T>): Promise<{ instance?: T, errors?: string[] }> {
        const factory = await ObjectFactory.create<T>(input, type);
        if (factory.valid) {
            return { instance: factory.instance };
        } else {
            const errors = (factory.result({ flattened: true }) as ResultSet).errors || [];
            return { errors };
        }
    }

    public static async updateOrThrow<T>(
        existing: T,
        input: unknown,
        type: UpdatableClass<T>,
        message = 'Validated object instance is not available because input is invalid.',
    ): Promise<T> {
        const factory = await ObjectFactory.update<T>(existing, input, type);
        return factory.getInstanceOrThrow(message);
    }

    public static async updateOrErrors<T>(
        existing: T,
        input: unknown,
        type: UpdatableClass<T>,
    ): Promise<{ instance?: T, errors?: string[] }> {
        const factory = await ObjectFactory.update<T>(existing, input, type);

        if (factory.valid) {
            return { instance: factory.instance };
        } else {
            const errors = (factory.result({ flattened: true }) as ResultSet).errors || [];
            return { errors };
        }
    }

}

function assertObjectFactoryClass<T>(type: unknown): asserts type is ObjectFactoryClass<T> {
    if (typeof type !== 'function') {
        throw new Error('ObjectFactory requires a class constructor with static validateInput(input) and fromValidInput(input).');
    }

    const candidate = type as Partial<ObjectFactoryClass<T>>;

    if (typeof candidate.validateInput !== 'function' || typeof candidate.fromValidInput !== 'function') {
        throw new Error('Class must expose static validateInput(input) and static fromValidInput(input) methods.');
    }
}

function assertUpdatableClass<T>(type: unknown): asserts type is UpdatableClass<T> {
    if (typeof type !== 'function') {
        throw new Error('ObjectFactory requires a class constructor with static validateUpdate(oldValue, newValue) and updateFrom(existing, input).');
    }

    const candidate = type as Partial<UpdatableClass<T>>;

    if (typeof candidate.validateUpdate !== 'function' || typeof candidate.updateFrom !== 'function') {
        throw new Error('Class must expose static validateUpdate(oldValue, newValue) and static updateFrom(existing, input) methods.');
    }
}