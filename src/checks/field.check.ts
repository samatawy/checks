import type { CheckOptions, TolerantCheckOptions } from '../types';
import type { DecoratedValidationOptions } from '../decorators/decorator.factory';
import { appendError } from "./helper.functions";

import { NumberCheck } from './number.check';
import { StringCheck } from './string.check';
import { EmailCheck } from './email.check';
import { UrlCheck } from './url.check';
import { ValueCheck } from './value.check';
import { DateCheck } from './date.check';
import { ObjectCheck } from './object.check';
import { ArrayCheck } from './array.check';
import { FileCheck } from './file.check';
import { ImageCheck } from './image.check';

export class FieldCheck extends ValueCheck {

    constructor(key: string | number, data: any) {
        super(key, data);
    }

    public required(options?: CheckOptions): this {
        if (this.data === null || this.data === undefined ||
            this.key === null || this.key === undefined ||
            this.data[this.key] === null || this.data[this.key] === undefined) {
            this.out = appendError(this.out, `Field ${this.key} is required`, options);
        }
        return this;
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

    public array(): ArrayCheck {
        return new ArrayCheck(this.key, this.data).inherit(this.out);
    }

    public async file(): Promise<FileCheck> {
        return (await FileCheck.for(this.key, this.data)).inherit(this.out);
    }

    public async image(): Promise<ImageCheck> {
        return (await ImageCheck.for(this.key, this.data)); //.inherit(this.out);
    }

    public string(): StringCheck {
        return new StringCheck(this.key, this.data).inherit(this.out);
    }

    public email(): EmailCheck {
        return new EmailCheck(this.key, this.data).inherit(this.out);
    }

    public url(): UrlCheck {
        return new UrlCheck(this.key, this.data).inherit(this.out);
    }

    public number(options?: TolerantCheckOptions): NumberCheck {
        return new NumberCheck(this.key, this.data, options).inherit(this.out);
    }

    public date(): DateCheck {
        return new DateCheck(this.key, this.data).inherit(this.out);
    }

    public boolean(options?: TolerantCheckOptions): FieldCheck {
        if (!this.has_value) return this;

        const tolerant = options?.tolerant ?? false;
        if (typeof this.data[this.key] === 'boolean') {
            return this;
        }
        else if (tolerant && typeof this.data[this.key] === 'string') {
            const value = this.data[this.key].toLowerCase();
            if (value === 'true' || value === 'false') {
                this.data[this.key] = value === 'true';
                return this;
            } else {
                this.out = appendError(this.out, `Field ${this.key} must be a boolean string ('true' or 'false')`, options);
            }
        }
        else {
            this.out = appendError(this.out, `Field ${this.key} must be a boolean`, options);
        }

        return this;
    }
}