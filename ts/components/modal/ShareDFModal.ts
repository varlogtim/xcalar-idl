class ShareDFModal {
    private static modalHelper: ModalHelper;
    private static dagToShare: DagTabUser;

     /**
     * ShareDFModal.setup
     */
    public static setup(): void {
        const $modal: JQuery = this._getModal();
        this.modalHelper = new ModalHelper($modal, {
            noResize: true,
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });

        this._addEventListeners();
    }

    /**
     * ShareDFModal.show
     * @param dagToShare
     */
    public static show(dagToShare: DagTabUser): void {
        this.dagToShare = dagToShare;
        this.modalHelper.setup();
        this._reset();
        this._setPath(this._getUniquePath());
    }

    private static _reset(): void {
        const $modal: JQuery = this._getModal();
        $modal.find(".checkbox").addClass("checked");

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

    private static _close(): void {
        this.modalHelper.clear();
        this.dagToShare = null;
        StatusBox.forceHide();
    }

    private static _submitForm(): void {
        const res: {path: string} = this._validate();
        if (res == null) {
            return;
        }
        this.modalHelper.addWaitingBG();
        this.modalHelper.disableSubmit();
        const $modal: JQuery = this._getModal();
        const path: string = res.path;
        const shareDS: boolean = $modal.find(".shareDS .checkbox").hasClass("checked");
        const keepCopy: boolean = $modal.find(".keepCopy .checkbox").hasClass("checked");

        const graph: DagGraph = this.dagToShare.getGraph();
        const fakeDag: DagTabShared = new DagTabShared(path, null, graph);
        let hasShared: boolean = false;
        
        fakeDag.share()
        .then(() => {
            hasShared = true;
            return this._advencedOptions({
                shareDS: shareDS,
                keepCopy: keepCopy,
                dag: this.dagToShare
            });
        })
        .then(() => {
            this._close();
            DagList.Instance.refresh();
        })
        .fail((error) => {
            if (hasShared) {
                this._close();
                DagList.Instance.refresh();
                Alert.error(DFTStr.ShareFail, error);
            } else {
                const $bth: JQuery = this._getModal().find(".confirm");
                StatusBox.show(DFTStr.Share, $bth, false, {
                    detail: error.log
                });
            }
        })
        .always(() => {
            this.modalHelper.removeWaitingBG();
            this.modalHelper.enableSubmit();
        });
    }

    private static _validate(): {path: string} {
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

    private static _advencedOptions(options: {
        shareDS: boolean,
        keepCopy: boolean,
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
                    promises.push(DS.shareDS(dsName));
                }
            });
            return PromiseHelper.when(...promises);
        };

        let deleteLocalCopy = (): XDPromise<void> => {
            if (options.keepCopy) {
                return PromiseHelper.resolve();
            }
            const dag: DagTabUser = options.dag;
            if (!DagTabManager.Instance.removeTab(dag.getId())) {
                return PromiseHelper.reject(DFTStr.DelFail);
            }
            return dag.delete();
        };
        
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        PromiseHelper.when(shareDS(), deleteLocalCopy())
        .then(deferred.resolve)
        .fail((...arg) => {
            const error: string = arg.filter((e) => e != null).join("\n");
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private static _getUniquePath(): string {
        const userName: string = XcUser.CurrentUser.getName().replace(/\//g, "_");
        const dagName: string = this.dagToShare.getName();
        let path: string = `${userName}/${dagName}`;
        let cnt = 0;
        while (!DagList.Instance.isUniqueName(path)) {
            path = `${userName}/${dagName}(${++cnt})`;
        }
        return path;
    }

    private static _setPath(path: string = ""): void {
        this._getPathEl().val(path);
    }

    private static _getModal(): JQuery {
        return $("#shareDFModal");
    }

    private static _getPathEl(): JQuery {
        return this._getModal().find(".path input");
    }

    private static _addEventListeners(): void {
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
    }
}