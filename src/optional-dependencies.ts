type FileTypeModule = {
    fileTypeFromBuffer: typeof import('file-type').fileTypeFromBuffer;
};

type ProbeImageSizeModule = {
    sync: typeof import('probe-image-size').sync;
};

let fileTypeModulePromise: Promise<FileTypeModule> | undefined;
let probeImageSizeModulePromise: Promise<ProbeImageSizeModule> | undefined;

export async function loadFileTypeModule(): Promise<FileTypeModule> {
    fileTypeModulePromise = fileTypeModulePromise ?? import('file-type').then(importedModule => {
        const module = importedModule as unknown as FileTypeModule & {
            default?: Partial<FileTypeModule>;
        };

        return {
            fileTypeFromBuffer: module.fileTypeFromBuffer ?? module.default?.fileTypeFromBuffer!,
        };
    });
    return fileTypeModulePromise;
}

export async function loadProbeImageSizeModule(): Promise<ProbeImageSizeModule> {
    probeImageSizeModulePromise = probeImageSizeModulePromise ?? import('probe-image-size').then(importedModule => {
        const module = importedModule as unknown as ProbeImageSizeModule & {
            default?: Partial<ProbeImageSizeModule>;
        };

        return {
            sync: module.sync ?? module.default?.sync!,
        };
    });
    return probeImageSizeModulePromise;
}