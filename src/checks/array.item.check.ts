import type { CheckOptions } from '../types';
import type { DecoratedValidationOptions } from '../decorators/decorator.factory';
import { appendError } from './helper.functions';
import { NumberCheck } from './number.check';
import { StringCheck } from './string.check';
import { ValueCheck } from './value.check';
import { DateCheck } from './date.check';
import { ObjectCheck } from './object.check';
import { ArrayCheck } from './array.check';
import { FieldCheck } from './field.check';

export class ArrayItemCheck extends ValueCheck {

    private item: any;

    constructor(key: number, data: unknown) {
        super(key, data);

        this.item = (data && typeof data === 'object') ? (data as any)[key] : null;
    }

    public object(): ObjectCheck {
        return new ObjectCheck(this.key, this.data).inherit(this.out);
    }

    public async decorated<T>(
        type: abstract new (...args: any[]) => T,
        options?: DecoratedValidationOptions,
    ): Promise<ObjectCheck> {
        return this.object().decorated(type, options);
    }

    public required(name: string, options?: CheckOptions): FieldCheck {
        return new FieldCheck(name, this.item).required(options);
    }

    public optional(name: string): FieldCheck {
        return new FieldCheck(name, this.item);
    }

    public conditional(name: string, condition: (data: any) => boolean, options?: CheckOptions): FieldCheck {
        if (condition(this.data)) {
            return new FieldCheck(name, this.item).required(options);
        } else {
            return new FieldCheck(name, this.item);
        }
    }

    public array(): ArrayCheck {
        return new ArrayCheck(this.key, this.item).inherit(this.out);
    }

    public string(): StringCheck {
        return new StringCheck(this.key, this.item).inherit(this.out);
    }

    public number(): NumberCheck {
        return new NumberCheck(this.key, this.item).inherit(this.out);
    }

    public date(): DateCheck {
        return new DateCheck(this.key, this.item).inherit(this.out);
    }

    public boolean(): ArrayItemCheck {
        if (!this.has_value) return this;

        if (typeof this.item !== 'boolean') {
            this.out = appendError(this.out, `Item ${this.key} must be a boolean`);
        }
        return this;
    }
}