/**
 * Base class for file manager components.
 * It basiclly serves 2 purposes,
 * 1. Call apis (e.g. download, upload)
 * 2. Respond to UX events (e.g. open)
 */
abstract class BaseFileManager {
    public abstract open(path: string): void;
    public abstract download(path: string): void | XDPromise<void>;
    public abstract delete(path: string[]): void;
    public abstract isWritable(path: string): boolean;
    public abstract isSharable(path: string): boolean;
    public abstract share(path: string): void;
    public abstract buildPathTree(clean?: boolean): void;
    public abstract fileIcon(): string;
    public abstract fileExtension(): string;
    public abstract add(path: string, entireString: string);
}
