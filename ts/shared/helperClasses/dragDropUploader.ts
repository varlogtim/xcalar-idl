class DragDropUploader {
    private $container: JQuery;
    private $dropArea: JQuery;
    private helpText: string;
    private onDropCallback: Function;
    private onErrorCallback: Function;
    private dragCount: number;

    constructor(options: {
        $container: JQuery,
        onDrop: Function,
        text?: string,
        onError?: Function
    }) {
        this.$container = options.$container;
        this.helpText = options.text || "Drop here";
        this.onDropCallback = options.onDrop;
        this.onErrorCallback = options.onError || function(){};
        this.dragCount = 0;
        this.setup();
    }

    private setup(): void {
        const $dropArea: JQuery = $('<div class="xc-dragDropArea">' + this.helpText + '</div>');
        this.$container.append($dropArea);
        this.$dropArea = $dropArea;

        this.$container.on('drag dragstart dragend dragover dragenter dragleave',
            function(event) {
            event.preventDefault();
            event.stopPropagation();
        });

        this.toggle(true);
    }

    public toggle(activate: boolean): void {
        const self = this;
        if (!activate) {
            this.$container.off(".xcUpload");
            this.$container.removeClass("xc-fileDroppable");
        } else {
            this.$container.addClass("xc-fileDroppable");
            this.$container.on('dragenter.xcUpload', function(event) {
                const dt = event.originalEvent.dataTransfer;
                if (dt.types && (dt.types.indexOf ?
                    dt.types.indexOf('Files') !== -1 :
                    dt.types.contains('Files'))) {
                    dt.effectAllowed = "copy";
                    dt.dropEffect = "copy";
                    self.$dropArea.addClass('entering');
                    self.dragCount++;
                }
            });

            this.$container.on('dragover.xcUpload', function(event) {
                event.originalEvent.dataTransfer.effectAllowed = "copy";
                event.originalEvent.dataTransfer.dropEffect = "copy";
            });

            this.$container.on('dragleave.xcUpload', function(event) {
                const dt = event.originalEvent.dataTransfer;
                if (dt.types && (dt.types.indexOf ?
                    dt.types.indexOf('Files') !== -1 :
                    dt.types.contains('Files'))) {
                    self.dragCount--;
                    if (self.dragCount === 0) {
                        self.$dropArea.removeClass('entering');
                    }
                }
            });

            this.$container.on('drop.xcUpload', function(event) {
                self.dragCount = 0;
                self.$dropArea.removeClass('entering');
                const e: object = event.originalEvent;
                const files: object[] = e.dataTransfer.files;
                if (!files || !files.length) {
                    return;
                }
                let error: string;
                if (files.length > 1) {
                    error = "multipleFiles";
                } else if (e.dataTransfer && e.dataTransfer.items &&
                    e.dataTransfer.items.length) {
                    let folderFound: boolean = false;
                    // special chrome check for folder
                    [].forEach.call(e.dataTransfer.items, function(item) {
                        const entry: object = item.webkitGetAsEntry();
                        if (entry && entry.isDirectory) {
                            folderFound = true;
                            return false;
                        }
                    });
                    if (folderFound){
                        error = "invalidFolder";
                    }
                }

                if (error) {
                    self.onErrorCallback(error);
                } else {
                    self.onDropCallback(files[0]);
                }
            });
        }
    }
}