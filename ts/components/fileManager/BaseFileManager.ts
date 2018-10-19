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
    public abstract canDelete(path: string): boolean;
    public abstract canDuplicate(path: string): boolean;
    public abstract canAdd(
        path: string,
        $inputSection?: JQuery,
        $actionButton?: JQuery
    ): boolean;
    public abstract canShare(path: string): boolean;
    public abstract copy(oldPath: string, newPath): XDPromise<void>;
    public abstract share(path: string): void;
    public abstract fileIcon(): string;
    public abstract fileExtension(): string;
    public abstract add(path: string, entireString: string);
    public abstract registerPanel(panel: FileManagerPanel);
    public abstract refresh();
}
