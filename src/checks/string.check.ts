import type { CheckOptions } from '../types';
import { StringBaseCheck } from './string.base.check';
import { EmailCheck } from './email.check';
import { UrlCheck } from './url.check';

export class StringCheck extends StringBaseCheck {

    constructor(key: string | number, data: any) {
        super(key, data);
    }

    public email(options?: CheckOptions): EmailCheck {
        return new EmailCheck(this.key!, this.data);
    }

    public url(options?: CheckOptions): UrlCheck {
        return new UrlCheck(this.key!, this.data);
    }

    public isBase64(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid Base64 string`, options);
        }
        return this;
    }

    public isSHA256(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[A-Fa-f0-9]{64}$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid SHA-256 hash`, options);
        }
        return this;
    }

    public isMD5(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[A-Fa-f0-9]{32}$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid MD5 hash`, options);
        }
        return this;
    }

    public isUUID(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid UUID`, options);
        }
        return this;
    }

    public isHexadecimal(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[A-Fa-f0-9]+$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid hexadecimal string`, options);
        }
        return this;
    }

    public isAlphanumeric(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[A-Za-z0-9]+$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be an alphanumeric string`, options);
        }
        return this;
    }

    public isAscii(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[\x00-\x7F]*$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must contain only ASCII characters`, options);
        }
        return this;
    }

    public hasMultibyte(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (/^[\x00-\x7F]*$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must contain at least one multibyte character`, options);
        }
        return this;
    }

    public hasUpperCase(min_count: number = 1, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const matches = this.data[this.key].match(/[A-Z]/g) || [];
        if (matches.length < min_count) {
            this.errorMessage(`Field ${this.key} must contain at least ${min_count} uppercase letter(s)`, options);
        }
        return this;
    }

    public hasLowerCase(min_count: number = 1, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const matches = this.data[this.key].match(/[a-z]/g) || [];
        if (matches.length < min_count) {
            this.errorMessage(`Field ${this.key} must contain at least ${min_count} lowercase letter(s)`, options);
        }
        return this;
    }

    public hasDigit(min_count: number = 1, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const matches = this.data[this.key].match(/\d/g) || [];
        if (matches.length < min_count) {
            this.errorMessage(`Field ${this.key} must contain at least ${min_count} digit(s)`, options);
        }
        return this;
    }

    public hasSpecialCharacter(min_count: number = 1, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const matches = this.data[this.key].match(/[!@#$%^&*(),.?":{}|<>]/g) || [];
        if (matches.length < min_count) {
            this.errorMessage(`Field ${this.key} must contain at least ${min_count} special character(s)`, options);
        }
        return this;
    }

    public noSpecialCharacters(chars?: string, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const pattern = chars ? new RegExp(`[${chars}]`) : /[!@#$%^&*(),.?":{}|<>]/;
        if (pattern.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must not contain special characters`, options);
        }
        return this;
    }

    public noSpaces(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (/\s/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must not contain spaces`, options);
        }
        return this;
    }

    public maxWords(count: number, options?: CheckOptions): this {
        if (!this.valid_type) return this;

        const wordCount = this.data[this.key].trim().split(/\s+/).length;
        if (wordCount > count) {
            this.errorMessage(`Field ${this.key} must be at most ${count} words`, options);
        }
        return this;
    }
}