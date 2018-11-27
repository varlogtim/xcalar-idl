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
        $actionButton?: JQuery,
        side?: string
    ): boolean;
    public abstract canShare(path: string): boolean;
    public abstract copy(oldPath: string, newPath): XDPromise<void>;
    public abstract share(path: string): void;
    public abstract fileType(): string;
    public abstract fileIcon(): string;
    public abstract fileExtension(): string;
    public abstract add(path: string, entireString: string);
    public abstract registerPanel(panel: FileManagerPanel);

    /**
     * refresh always update the file list if there are new files. But it does
     * not necessarily update the file content if there is a new version, or
     * delete a file that no longer exits.
     * @param  {boolean} isUpdate? File might have a new version
     * @param  {boolean} isDelete? There might be files deleted
     */
    public abstract refresh(isUpdate?: boolean, isDelete?: boolean);
}
