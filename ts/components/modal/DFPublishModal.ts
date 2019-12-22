class DFPublishModal {
    private static _instance: DFPublishModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _cachedDagTab: DagTabUser;

    private constructor() {
        const $modal: JQuery = this._getModal();
        if (XVM.isSingleUser()) {
            $modal.addClass("cloud");
            $modal.find(".onPremOnly").hide();
        }
        this._modalHelper = new ModalHelper($modal, {
            noResize: true,
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });

        this._addEventListeners();
    }

    /**
     *
     * @param dagTab
     */
    public show(dagTab: DagTabUser): void {
        if (!(dagTab instanceof DagTabUser)) {
            return;
        }
        this._cachedDagTab = dagTab;
        this._modalHelper.setup();
        this._reset();
        this._setPath(this._getUniquePath());
    }

    private _reset(): void {
        const $modal: JQuery = this._getModal();
        $modal.find(".checkbox").addClass("checked");
        $modal.find(".path .prefix").text(DagTabPublished.PATH);

        const $shareDS: JQuery = $modal.find(".shareDS .checkboxSection");
        if (DS.isSharingDisabled()) {
            xcTooltip.add($shareDS, {
                title: DSTStr.DisableShare
            });
            $shareDS.find(".checkbox").removeClass("checked");
            $shareDS.find(".checkbox, .text").addClass("xc-disabled");
        } else {
            xcTooltip.remove($shareDS);
            $shareDS.find(".checkbox, .text").removeClass("xc-disabled");
        }
    }

    private _close(): void {
        this._modalHelper.clear();
        this._cachedDagTab = null;
        StatusBox.forceHide();
    }

    private _submitForm(): void {
        const res: {path: string} = this._validate();
        if (res == null) {
            return;
        }
        this._modalHelper.addWaitingBG();
        this._modalHelper.disableSubmit();
        const $modal: JQuery = this._getModal();
        const path: string = res.path;
        const shareDS: boolean = XVM.isSingleUser() ? false : $modal.find(".shareDS .checkbox").hasClass("checked");

        const graph: DagGraph = this._cachedDagTab.getGraph();
        const tab: DagTabPublished = new DagTabPublished({
            name: path,
            dagGraph: graph
        });
        let hasShared: boolean = false;

        tab.publish()
        .then(() => {
            hasShared = true;
            return this._advencedOptions({
                shareDS: shareDS,
                dag: this._cachedDagTab
            });
        })
        .then(() => {
            this._submitDone(tab);
        })
        .fail((error) => {
            if (hasShared) {
                this._submitDone(tab);
                Alert.error(DFTStr.ShareFail, error);
            } else {
                const $bth: JQuery = this._getModal().find(".confirm");
                StatusBox.show(DFTStr.ShareFail, $bth, false, {
                    detail: error.log
                });
            }
        })
        .always(() => {
            this._modalHelper.removeWaitingBG();
            this._modalHelper.enableSubmit();
        });
    }

    private _submitDone(tab: DagTabPublished): void {
        this._close();
        DagList.Instance.addDag(<DagTab>tab);
        DagTabManager.Instance.loadTab(<DagTab>tab);
    }

    private _validate(): {path: string} {
        const $pathInput: JQuery = this._getPathEl();
        const path: string = $pathInput.val().trim();
        const splits: string[] = path.split("/");
        const shortName: string = splits[splits.length - 1];
        const isValid: boolean = xcHelper.validate([
            {
                $ele: $pathInput
            },
            {
                $ele: $pathInput,
                error: DFTStr.NoEmptyDestName,
                check: () => {
                    return !shortName;
                }
            },
            {
                $ele: $pathInput,
                error: ErrTStr.DFNameIllegal,
                check: () => {
                    !xcHelper.checkNamePattern(PatternCategory.Dataflow,
                        PatternAction.Check, shortName);
                }
            },
            {
                $ele: $pathInput,
                error: DFTStr.DupDataflowName,
                check: () => {
                    return !DagList.Instance.isUniqueName(path);
                }
            },
        ]);
        if (!isValid) {
            return null;
        }
        return {path: path};
    }

    private _advencedOptions(options: {
        shareDS: boolean,
        dag: DagTabUser
    }): XDPromise<any> {
        let shareDS = (): XDPromise<void> => {
            if (!options.shareDS) {
                return PromiseHelper.resolve();
            }
            // XXX TODO
            const dag: DagTabUser = options.dag;
            const promises: XDPromise<void>[] = [];
            dag.getGraph().getUsedDSNames().forEach((dsName) => {
                if (dsName) {
                    promises.push(DS.share(dsName));
                }
            });
            return PromiseHelper.when(...promises);
        };

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        shareDS()
        .then(deferred.resolve)
        .fail((args) => {
            const error: string = args.filter((e) => e != null).join("\n");
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _getUniquePath(): string {
        const userName: string = XcUser.CurrentUser.getName().replace(/\//g, "_");
        const dagName: string = this._cachedDagTab.getName();
        let path: string = `${userName}/${dagName}`;
        let cnt = 0;
        while (!DagList.Instance.isUniqueName(path)) {
            path = `${userName}/${dagName}(${++cnt})`;
        }
        return path;
    }

    private _setPath(path: string = ""): void {
        this._getPathEl().val(path);
    }

    private _getModal(): JQuery {
        return $("#dfPublishModal");
    }

    private _getPathEl(): JQuery {
        return this._getModal().find(".path input");
    }

    private _browse(): void {
        let rootPath: string = DagTabPublished.PATH;
        rootPath = rootPath.substring(0, rootPath.length - 1); // /Shared
        let fileLists: {path: string, id: string}[] = DagList.Instance.list();
        fileLists = fileLists.filter((fileObj) => {
            if (fileObj.path.startsWith(rootPath)) {
                fileObj.path = fileObj.path.substring(rootPath.length);
                return true;
            }
            return false;
        });
        // lock modal
        this._getModal().addClass("locked");
        const defaultPath: string = this._getPathEl().val().trim();
        const options = {
            rootPath: rootPath,
            defaultPath: defaultPath,
            onConfirm: (path, name) => {
                if (path) {
                    path = path + "/" + name;
                } else {
                    // when in the root
                    path = name;
                }
                this._setPath(path);
            },
            onClose: () => {
                // unlock modal
                this._getModal().removeClass("locked");
            }
        };
        DFBrowserModal.Instance.show(fileLists, options);
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        $modal.on("click", ".checkboxSection .text, .checkboxSection .checkbox", (event) => {
            $(event.currentTarget).closest(".checkboxSection")
            .find(".checkbox").toggleClass("checked");
        });

        $modal.find(".browse").click(() => {
            this._browse();
        });
    }
}