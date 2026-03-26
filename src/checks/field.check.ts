import type { CheckOptions } from './types';
import { appendError } from "./helper.functions";
import { NumberCheck } from './number.check';
import { StringCheck } from './string.check';
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

    public required(): this {
        if (this.data === null || this.data === undefined ||
            this.key === null || this.key === undefined ||
            this.data[this.key] === null || this.data[this.key] === undefined) {
            this.out = { ...this.out, ...{ valid: false, err: `Field ${this.key} is required` } };
        }
        return this;
    }

    public object(): ObjectCheck {
        return new ObjectCheck(this.key, this.data).inherit(this.out);
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

    public number(): NumberCheck {
        return new NumberCheck(this.key, this.data).inherit(this.out);
    }

    public date(): DateCheck {
        return new DateCheck(this.key, this.data).inherit(this.out);
    }

    public boolean(): FieldCheck {
        if (!this.has_value) return this;

        if (typeof this.data[this.key] !== 'boolean') {
            this.out = appendError(this.out, `Field ${this.key} must be a boolean`);
        }
        return this;
    }
}