import type { CheckOptions } from '../types';
import { defined } from './helper.functions';
import { loadProbeImageSizeModule } from '../optional-dependencies';
import { FileCheck } from './file.check';


export class ImageCheck extends FileCheck {

    // constructor should accept string | Blob | File | Uint8Array | ArrayBuffer | Buffer | null | undefined
    protected width?: number;

    protected height?: number;

    static async for(key: string | number, data: unknown): Promise<ImageCheck> {
        const check = new ImageCheck(key, data)
        await check.init();
        return check;
    }

    constructor(key: string | number, data: unknown) {
        super(key, data);

        // MUST call init() before proceeding..
    }

    protected async init(): Promise<this> {
        await super.init();

        if (this.has_value && this.buffer) {
            await this.loadImageMetadata();
            this.isImage();
        } else {
        }
        return this;
    }

    public isImage(options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (!defined(this.type)) {
            this.errorMessage(`Unable to determine image type for field ${this.key}`, options);
            return this;
        }
        if (!this.type.startsWith('image/')) {
            this.errorMessage(`Field ${this.key} must be an image file, but got type ${this.type}`, options);
        }
        return this;
    }

    public minWidth(minWidth: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (!defined(this.width)) {
            this.errorMessage(`Unable to determine image width for field ${this.key}`, options);
            return this;
        }
        if (this.width < minWidth) {
            this.errorMessage(`Field ${this.key} must be at least ${minWidth} pixels wide`, options);
        }
        return this;
    }

    public minHeight(minHeight: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (!defined(this.height)) {
            this.errorMessage(`Unable to determine image height for field ${this.key}`, options);
            return this;
        }
        if (this.height < minHeight) {
            this.errorMessage(`Field ${this.key} must be at least ${minHeight} pixels tall`, options);
        }
        return this;
    }

    public maxWidth(maxWidth: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (!defined(this.width)) {
            this.errorMessage(`Unable to determine image width for field ${this.key}`, options);
            return this;
        }
        if (this.width > maxWidth) {
            this.errorMessage(`Field ${this.key} must be at most ${maxWidth} pixels wide`, options);
        }
        return this;
    }

    public maxHeight(maxHeight: number, options?: CheckOptions): this {
        if (!this.buffer) return this;

        if (!defined(this.height)) {
            this.errorMessage(`Unable to determine image height for field ${this.key}`, options);
            return this;
        }
        if (this.height > maxHeight) {
            this.errorMessage(`Field ${this.key} must be at most ${maxHeight} pixels tall`, options);
        }
        return this;
    }

    protected async loadImageMetadata(): Promise<void> {
        if (!this.buffer) {
            throw new Error(`No file buffer available for field ${this.key}`);
        }

        const metadata = await this.getImageDimensions(this.buffer, this.type);
        if (!metadata) {
            this.errorMessage(`Field ${this.key} must be a valid image file`);
            return;
        }

        this.type = metadata.type;
        this.width = metadata.width;
        this.height = metadata.height;
    }

    protected async getImageDimensions(buffer: Uint8Array, type?: string): Promise<{ width: number, height: number, type: string } | null> {
        const bufferCtor = (globalThis as { Buffer?: typeof Buffer }).Buffer;
        if (bufferCtor) {
            const probe = await loadProbeImageSizeModule();
            // probe-image-size can work with a Buffer in Node, but not with Uint8Array directly, so we need to convert it first
            const result = probe.sync(bufferCtor.from(buffer));
            if (!result) return null;

            return { width: result.width, height: result.height, type: result.mime || type || 'application/octet-stream' };
        }

        // In the browser, we can use createImageBitmap to get the dimensions without needing to convert to a different type
        const createImageBitmapFn = (globalThis as {
            createImageBitmap?: (image: Blob) => Promise<{ width: number; height: number; close?: () => void }>;
        }).createImageBitmap;

        if (createImageBitmapFn) {
            const blob = new Blob([buffer], { type: type || 'application/octet-stream' });
            const bitmap = await createImageBitmapFn(blob);

            try {
                return { width: bitmap.width, height: bitmap.height, type: type || blob.type || 'application/octet-stream' };
            } finally {
                bitmap.close?.();
            }
        }

        return null;
    }

}