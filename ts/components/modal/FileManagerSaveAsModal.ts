class FileManagerSaveAsModal {
    private static _instance: FileManagerSaveAsModal;

    public static get Instance(): FileManagerSaveAsModal {
        return this._instance || (this._instance = new this());
    }

    private modalHelper: ModalHelper;
    private fileManagerPanel: FileManagerPanel;
    private options: {
        onSave?: (newPath: string) => void;
    };

    private constructor() {
        const $modal: JQuery = this._getModal();
        this.modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this.fileManagerPanel = new FileManagerPanel(this._getModal());
        this.fileManagerPanel.lock();
        this._getModal()
        .find(".fileManager .addressBox input")
        .prop("disabled", true);
        this._addEventListeners();
    }

    public show(
        filename: string,
        path: string,
        options: {
        onSave?: (newPath: string) => void;
        }
    ): void {
        this.modalHelper.setup();
        this.options = options;
        this._getNameInput().val(filename);
        this.fileManagerPanel.switchPathByStep(path, true);
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".save", () => {
            this._submitForm();
        });

        $modal.on(
            "mousedown",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const $row: JQuery = $(event.currentTarget).parent();
                const filename: string = $row.find(".nameField .label").text();
                if (!this.fileManagerPanel.isDir(filename)) {
                    this._getNameInput().val(filename);
                }
            }
        );
    }

    private _getModal(): JQuery {
        return $("#fileManagerSaveAsModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".saveAs input");
    }

    private _close(): void {
        this.modalHelper.clear();
        this.options = null;
        this._getNameInput().val("");
    }

    private _submitForm(): void {
        if (typeof this.options.onSave === "function") {
            let path: string = this.fileManagerPanel.getViewPath();
            const $pressed: JQuery = this._getModal().find(
                ".mainSection .pressed"
            );
            if ($pressed.length > 0) {
                const folderName: string = $pressed
                .find(".nameField .label")
                .text();
                if (this.fileManagerPanel.isDir(folderName)) {
                    path += folderName + "/";
                }
            }
            const saveAs: string = this._getNameInput().val();
            const newPath = path + saveAs;
            const $saveButton: JQuery = this._getModal().find(
                ".modalBottom .save"
            );
            if (
                this.fileManagerPanel.canAdd(
                    newPath,
                    this._getNameInput(),
                    $saveButton
                )
            ) {
                this.options.onSave(path + saveAs);
            } else {
                return;
            }
        }
        this._close();
    }
}
