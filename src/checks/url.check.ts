import type { CheckOptions } from './types';
import { StringBaseCheck } from './string.base.check';

export class UrlCheck extends StringBaseCheck {

    private _url?: URL;
    
    constructor(key: string | number, data: any) {
        super(key, data);

        if (this.has_value) {
            this.valid_type = !!this.toUrl(this.data[this.key]);

            this.url();
        }
    }

    private toUrl(value: string): URL | undefined {
        try {
            return new URL(value);
        } catch (e) {
            return undefined;
        }
    }

    public url(options?: CheckOptions): this {
        if (!this.valid_type) return this;

        this._url = this.toUrl(this.data[this.key]);

        if (!this._url) {
            this.errorMessage(`Field ${this.key} must be a valid URL`, options);
        }
        return this;
    }

    public host(oneOf: string[], options?: CheckOptions): this {
        if (!this.valid_type || !this._url) return this;

        const host = this._url.host;
        if (!oneOf.includes(host)) {
            this.errorMessage(`Field ${this.key} must have a host of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

    public tld(oneOf: string[], options?: CheckOptions): this {
        if (!this.valid_type || !this._url) return this;

        const domainParts = this._url.hostname.split('.');
        if (domainParts.length < 2) {
            this.errorMessage(`Field ${this.key} must be a valid URL with a TLD`, options);
            return this;
        }

        const tld = domainParts[domainParts.length - 1];
        if (tld && !oneOf.includes(tld)) {
            this.errorMessage(`Field ${this.key} must have a TLD of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

    public protocol(oneOf: string[], options?: CheckOptions): this {
        if (!this.valid_type || !this._url) return this;

        const protocol = this._url.protocol.replace(':', ''); // Remove the trailing colon
        if (!oneOf.includes(protocol)) {
            this.errorMessage(`Field ${this.key} must have a protocol of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

    public port(oneOf: (number | string)[], options?: CheckOptions): this {
        if (!this.valid_type || !this._url) return this;

        const port = this._url.port || (this._url.protocol === 'https:' ? '443' : '80'); // Default ports for http and https
        if (!oneOf.includes(port) && !oneOf.includes(parseInt(port))) {
            this.errorMessage(`Field ${this.key} must have a port of one of the following: ${oneOf.join(', ')}`, options);
        }
        return this;
    }

}