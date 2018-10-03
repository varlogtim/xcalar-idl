/**
 * Base class for file manager components.
 * It basiclly serves 2 purposes,
 * 1. Call apis (e.g. download, upload)
 * 2. Respond to UX event (e.g. open)
 */
abstract class BaseFileManager {
    public abstract open(path: string): void;
    public abstract download(path: string): void | XDPromise<void>;
    public abstract delete(path: string[]): void;
}
