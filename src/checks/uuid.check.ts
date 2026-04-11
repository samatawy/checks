import type { CheckOptions, UUIDCheckOptions, UUIDVersion } from '../types';
import { StringBaseCheck } from './string.base.check';

type UUIDCheckMode = 'uuid' | 'ulid';

export class UUIDCheck extends StringBaseCheck {

    private mode: UUIDCheckMode;

    constructor(key: string | number, data: any, mode: UUIDCheckMode = 'uuid', options?: UUIDCheckOptions | CheckOptions) {
        super(key, data);

        this.mode = mode;

        if (!this.has_value) {
            return;
        }

        if (mode === 'uuid') {
            this.validateUUID((options as UUIDCheckOptions | undefined)?.version, options);
            this.valid_type = this.out.valid;
            return;
        } else {
            this.isULID(options);
            this.valid_type = this.out.valid;
            return;
        }
    }

    public version(version: UUIDVersion | UUIDVersion[], options?: CheckOptions): this {
        if (!this.valid_type) return this;

        this.validateUUID(version, options);
        return this;
    }

    public isULID(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(this.data[this.key])) {
            this.errorMessage(`Field ${this.key} must be a valid ULID`, options);
        }
        return this;
    }

    private validateUUID(version?: UUIDVersion | UUIDVersion[], options?: CheckOptions): void {
        const uuidPattern = this.buildUUIDPattern(version);

        if (!uuidPattern.test(this.data[this.key])) {
            this.errorMessage(this.buildUUIDMessage(version), options);
        }
    }

    private buildUUIDPattern(version?: UUIDVersion | UUIDVersion[]): RegExp {
        const versions = this.normalizeUUIDVersions(version);
        const versionPattern = versions ? `[${versions.join('')}]` : '[1-8]';

        return new RegExp(
            `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${versionPattern}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`,
        );
    }

    private buildUUIDMessage(version?: UUIDVersion | UUIDVersion[]): string {
        const versions = this.normalizeUUIDVersions(version);

        if (!versions) {
            return `Field ${this.key} must be a valid UUID`;
        }

        if (versions.length === 1) {
            return `Field ${this.key} must be a valid UUIDv${versions[0]}`;
        }

        return `Field ${this.key} must be a valid UUID matching one of the allowed versions: ${versions.join(', ')}`;
    }

    private normalizeUUIDVersions(version?: UUIDVersion | UUIDVersion[]): UUIDVersion[] | undefined {
        if (version === undefined) {
            return undefined;
        }

        const versions = Array.isArray(version) ? [...version] : [version];

        if (versions.length === 0) {
            throw new Error('UUID version list must not be empty.');
        }

        for (const entry of versions) {
            if (!Number.isInteger(entry) || entry < 1 || entry > 8) {
                throw new Error(`Unsupported UUID version: ${String(entry)}.`);
            }
        }

        return [...new Set(versions)].sort((left, right) => left - right) as UUIDVersion[];
    }

    protected createAlternativeChecker(): this {
        const ValueCheckClass = this.constructor as new (
            key: string | number,
            data: any,
            mode?: UUIDCheckMode,
        ) => this;

        return new ValueCheckClass(this.key, this.cloneAlternativeValue(this.data), this.mode)
            .updating(this.cloneAlternativeValue(this.oldData));
    }
}