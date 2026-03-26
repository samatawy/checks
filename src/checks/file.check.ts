import type { CheckOptions } from './types';
import { ValueCheck } from './value.check';
import { fileTypeFromBuffer } from 'file-type'; // Works in Node AND browser!


export class FileCheck extends ValueCheck {

    // constructor should accept string | Blob | File | Uint8Array | ArrayBuffer | Buffer | null | undefined
    protected buffer?: Uint8Array;

    protected type?: string;

    static async for(key: string | number, data: unknown): Promise<FileCheck> {
        const check = new FileCheck(key, data)
        await check.init();
        return check;
    }

    protected constructor(key: string | number, data: unknown) {
        super(key, data);

        // MUST call init() before proceeding..
    }

    protected async init(): Promise<this> {
        if (this.has_value) {
            try {
                const buffer = await this.toUint8Array(this.data[this.key]);
                const mime = await this.getMimeType(buffer);

                this.buffer = buffer;
                this.type = mime;
            } catch {
                this.errorMessage(`Field ${this.key} must be a valid file`);
            }

        } else {
        }
        return this;
    }

    public mimeType(expectedMime: string, options?: CheckOptions): this {
        if (!this.buffer) return this;
        if (!this.type) {
            this.errorMessage(`Unable to determine MIME type of field ${this.key}`, options);
            return this;
        }

            if (expectedMime.endsWith('/*')) {
                const prefix = expectedMime.slice(0, -2);
                if (!this.type.startsWith(prefix + '/')) {
                    this.errorMessage(`Field ${this.key} must be of type ${expectedMime}, but got ${this.type}`, options);
                }
                return this;
            } else if (this.type !== expectedMime) {
                this.errorMessage(`Field ${this.key} must be of type ${expectedMime}, but got ${this.type}`, options);
            }
            return this;
    }

    public notEmpty(options?: CheckOptions): this {
        if (!this.buffer || this.getSize() === 0) {
            this.errorMessage(`Field ${this.key} must not be an empty file`, options);
        }
        return this;
    }

    public minSize(minBytes: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (this.getSize() < minBytes) {
            this.errorMessage(`Field ${this.key} must be at least ${minBytes} bytes`, options);
        }
        return this;
    }

    public maxSize(maxBytes: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (this.getSize() > maxBytes) {
            this.errorMessage(`Field ${this.key} must be at most ${maxBytes} bytes`, options);
        }
        return this;
    }

    protected getSize(): number {
        if (!this.buffer) return 0;
        return this.buffer.length;
    }

    protected spliceBuffer(start: number, end?: number): Uint8Array {
        if (!this.buffer) return new Uint8Array();
        return this.buffer.subarray(start, end);
    }

    protected async toUint8Array(input: unknown, maxBytes = Infinity): Promise<Uint8Array> {
        // Already Uint8Array
        if (input instanceof Uint8Array) {
            return maxBytes < input.length ? input.subarray(0, maxBytes) : input;
        }

        // ArrayBuffer
        if (input instanceof ArrayBuffer) {
            const len = Math.min(input.byteLength, maxBytes);
            return new Uint8Array(input, 0, len);
        }

        // ArrayBufferView (Buffer, DataView, TypedArrays)
        if (ArrayBuffer.isView(input)) {
            const len = Math.min(input.byteLength, maxBytes);
            return new Uint8Array(input.buffer, input.byteOffset, len);
        }

        // Blob/File (browser + Node.js ≥18)
        if (input && typeof (input as any).arrayBuffer === 'function') {
            const slice = (input as Blob).slice(0, maxBytes);
            return new Uint8Array(await slice.arrayBuffer());
        }

        // Fallback for legacy Node.js Buffer
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
            return Buffer.from(input).subarray(0, maxBytes) as Uint8Array;
        }

        if (typeof input === 'string' && input.startsWith('data:')) {
            const base64 = input.split(';base64,')[1];
            if (!base64) throw new Error('Invalid data URL');
            return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).subarray(0, maxBytes);
        }

        throw new TypeError(`Unsupported input type: ${input?.constructor?.name || typeof input}`);
    }

    protected async getMimeType(buffer: Uint8Array): Promise<string> {
        const header = buffer.subarray(0, 4100);
        const result = await fileTypeFromBuffer(header);

        return result?.mime || 'application/octet-stream';
    }

}