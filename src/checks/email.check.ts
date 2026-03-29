import type { CheckOptions } from './types';
import { StringBaseCheck } from './string.base.check';

export class EmailCheck extends StringBaseCheck {

    private _email?: string;
    
    constructor(key: string | number, data: any) {
        super(key, data);

        if (this.has_value) {
            this.email();
            this.valid_type = this._email !== undefined;
        }
    }

    private isEmail(value: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
    }

    public email(options?: CheckOptions): this {
        if (!this.valid_type || !this._email) return this;

        this._email = this.data[this.key];
        if (this.isEmail(this._email!)) {
            return this;
        } else {
            this._email = undefined;
            this.errorMessage(`Field ${this.key} must be a valid email address`, options);
            return this;
        }
    }

    public host(oneOf: string[], options?: CheckOptions): this {
        if (!this.valid_type || !this._email) return this;

        const parts = this._email.split('@');
        if (parts.length !== 2) {
            return this;
        }

        const host = parts[1];
        if (!oneOf.includes(host!)) {
            this.errorMessage(`Field ${this.key} must have a host of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

    public tld(oneOf: string[], options?: CheckOptions): this {
        if (!this.valid_type || !this._email) return this;

        const parts = this._email.split('@');
        if (parts.length !== 2) {
            return this;
        }

        const domainParts = parts[1]!.split('.');
        if (domainParts.length < 2) {
            this.errorMessage(`Field ${this.key} must be a valid email address`, options);
            return this;
        }

        const tld = domainParts[domainParts.length - 1];
        if (!oneOf.includes(tld!)) {
            this.errorMessage(`Field ${this.key} must have a top-level domain of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

}