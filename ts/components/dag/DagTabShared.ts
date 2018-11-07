class DagTabShared extends DagTab {
    public static readonly PATH = "/Shared/";
    // XXX TODO: encrypt it
    private static readonly _secretUser: string = ".xcalar.shared.df";
    private static readonly _delim: string = "_Xcalar_";
    private static _currentSession: string;

    private _version: number;
    /**
     * DagTabShared.restore
     */
    public static restore(): XDPromise<DagTabShared[]> {
        const deferred: XDDeferred<DagTabShared[]> = PromiseHelper.deferred();
        this._switchSession(null);
        XcalarListWorkbooks("*")
        .then((res: {sessions: any[]}) => {
            const dags: DagTabShared[] = [];
            res.sessions.map((sessionInfo) => {
                const name: string = sessionInfo.name;
                if (!name.startsWith(".temp")) {
                    // filter out .temp dataflows
                    const id: string = sessionInfo.sessionId;
                    dags.push(new DagTabShared(name, id));
                }
            });
            deferred.resolve(dags);
        })
        .fail(deferred.reject);

        this._resetSession();
        return deferred.promise();
    }

    private static _switchSession(sharedDFName: string): void {
        this._currentSession = sessionName;
        const user: XcUser = new XcUser(this._secretUser);
        XcUser.setUserSession(user);
        setSessionName(sharedDFName);
    }

    private static _resetSession(): void {
        XcUser.resetUserSession();
        setSessionName(this._currentSession);
    }

    public constructor(name: string, id?: string, graph?: DagGraph) {
        name = name.replace(new RegExp(DagTabShared._delim, "g"), "/");
        super(name, id, graph);
        this._kvStore = new KVStore("DF2", gKVScope.WKBK);
        this._tempKVStore = new KVStore(`.temp.DF2.shared.${this._id}`, gKVScope.WKBK);
        this._version = 0;
    }

    public getName(): string {
        return this._name;
    }

    public getShortName(): string {
        const name: string = this.getName();
        const splits: string[] = name.split("/");
        return splits[splits.length - 1];
    }

    public getPath(): string {
        return DagTabShared.PATH + this.getName();
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let savedDagInfo: any;
        let savedGraph: DagGraph;

        this._loadFromKVStore()
        .then((dagInfo, graph) => {
            savedDagInfo = dagInfo;
            savedGraph = graph;
            return this._loadFromTempKVStore();
        })
        .then((tempDagInfo, tempGraph) => {
            if (tempDagInfo == null ||
                tempDagInfo.version !== savedDagInfo.version
            ) {
                // when no local meta or it's lower version, use the saved one
                this._unsaved = false;
                this._version = savedDagInfo.version;
                this._setGraph(savedGraph);
            } else {
                this._unsaved = tempDagInfo.unsaved;
                this._version = tempDagInfo.version;
                this._setGraph(tempGraph);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public save(forceSave: boolean = false): XDPromise<void> {
        if (!forceSave) {
            this._unsaved = true;
            return this._writeToTempKVStore()
                    .then(() => {
                        this._trigger("modify");
                    });
        }

        const oldVersion: number = this._version;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((dagInfo) => {
            // when version not match, cannot save
            if (dagInfo == null || dagInfo.version !== this._version) {
                return PromiseHelper.reject();
            }

            this._version++;
            this._writeToKVStore();
        })
        .then(() => {
            // also save the local temp meta
            this._unsaved = false;
            const promise = this._writeToTempKVStore();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(() => {
            this._trigger("save");
            KVStore.logSave(true);
            deferred.resolve();
        })
        .fail((error) => {
            this._version = oldVersion;
            deferred.reject(error);
        })

        return deferred.promise();
    }

    public delete(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabShared._switchSession(null);
        XcalarDeleteWorkbook(this._getWKBKName())
        .then(() => {
            return PromiseHelper.alwaysResolve(this._tempKVStore.delete());
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (error.status === StatusT.StatusSessionNotFound) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        DagTabShared._resetSession();
        return deferred.promise();
    }

    public upload(content: string): XDPromise<void> {
        DagTabShared._switchSession(null);
        const promise = XcalarUploadWorkbook(this._getWKBKName(), content, "");
        DagTabShared._resetSession();
        return promise;
    }

    public download(name: string, optimized?: boolean): XDPromise<void> {
        let fileName: string = name || this.getShortName();
        fileName += ".tar.gz";
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabShared._switchSession(null);
        // XXX TODO, backend should give a flag about it's DF or WKBK
        XcalarDownloadWorkbook(this._getWKBKName(), "")
        .then((file) => {
            xcHelper.downloadAsFile(fileName, file.sessionContent, true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        DagTabShared._resetSession();
        return deferred.promise();
    }

    public share(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasCreatWKBK: boolean = false;
        this._createWKBK()
        .then(() => {
            hasCreatWKBK = true;
            return this._writeToKVStore();
        })
        .then(() => {
            // XXX TODO: remove it when backend support (13855)
            const wkbkNmae: string = this._getWKBKName();
            DagTabShared._switchSession(this._getWKBKName());
            const promise = XcalarActivateWorkbook(wkbkNmae);
            DagTabShared._resetSession();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(() => {
            return this._uploadUDFToWKBK();
        })
        .then(() => {
            // XXX TODO: remove it when backend support (13855)
            const wkbkNmae: string = this._getWKBKName();
            DagTabShared._switchSession(this._getWKBKName());
            const promise = XcalarDeactivateWorkbook(wkbkNmae);
            DagTabShared._resetSession();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (typeof error === "string") {
                error = {log: error};
            }
            if (hasCreatWKBK) {
                // if fails and workbook has created
                // delete it as a rollback
                this._deleteWKBK();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public clone(newTabName): XDPromise<void> {
        const wkbkName: string = this._getWKBKName();
        const newWkbkName: string = this._getWKBKName(newTabName);
        DagTabShared._switchSession(wkbkName);
        const promise = XcalarNewWorkbook(newTabName, true, wkbkName)
        DagTabShared._resetSession();
        return promise;
    }

    protected _loadFromKVStore(): XDPromise<any> {
        DagTabShared._switchSession(this._getWKBKName());
        const promise = super._loadFromKVStore();
        DagTabShared._resetSession();
        return promise;
    }

    // save meta
     // XXX TODO: add socket to lock other users
     protected _writeToKVStore(): XDPromise<any> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const json = this._getJSON(true);
        if (json == null) {
            return PromiseHelper.reject("Invalid dataflow structure");
        }
        DagTabShared._switchSession(this._getWKBKName());
        const promise = super._writeToKVStore(json);
        DagTabShared._resetSession();
        return promise;
    }

    protected _getJSON(forceSave: boolean = false): {
        name: string,
        id: string,
        dag: string,
        autoSave: boolean,
        version: number,
        unsaved?: boolean
    } {
        const json: {
            name: string,
            id: string,
            dag: string,
            autoSave: boolean,
            version: number,
            unsaved?: boolean
        } = <any>super._getJSON();
        json.version = this._version;
        if (forceSave) {
            const serazliedGraph: string = this._getSeriazliedGraphToSave();
            if (serazliedGraph == null) {
                return null; // error case
            }
            json.dag = serazliedGraph;
        } else {
            json.unsaved = this._unsaved;
        }

        return json;
    }

    private _getWKBKName(name?: string): string {
        name = name || this._name;
        return name.replace(/\//g, DagTabShared._delim);
    }

    private _createWKBK(): XDPromise<void> {
        DagTabShared._switchSession(null);
        const promise = XcalarNewWorkbook(this._getWKBKName());
        DagTabShared._resetSession();
        return promise;
    }

    private _deleteWKBK(): XDPromise<void> {
        DagTabShared._switchSession(null);
        const promise = XcalarDeleteWorkbook(this._getWKBKName());
        DagTabShared._resetSession();
        return promise;
    }

    private _uploadUDFToWKBK(): XDPromise<void> {
        let downloadHelper = (moduleName: string): XDPromise<string> => {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            const udfPath = UDFFileManager.Instance.getCurrWorkbookPath() + moduleName;
            UDFFileManager.Instance.getEntireUDF(udfPath)
            .then((udfStr: string) => {
                deferred.resolve(udfStr);
            })
            .fail((error, isDownloadErr) => {
                if (isDownloadErr) {
                    // when download udf has error
                    deferred.reject(error);
                } else {
                    // when the local udf not exist, it should be a gloal one
                    deferred.resolve(null);
                }
            });

            return deferred.promise();
        };

        let upload = (moduleName: string): XDPromise<void> => {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            downloadHelper(moduleName)
            .then((udfStr) => {
                if (udfStr == null) {
                    // nothing to upload
                    return;
                }
                // XXX TODO: use absolute path
                DagTabShared._switchSession(this._getWKBKName());
                const promise = XcalarUploadPython(moduleName, udfStr);
                DagTabShared._resetSession();
                return promise;
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            
            return deferred.promise();
        }

        const udfSet: Set<string> = this._dagGraph.getUsedUDFModules();
        const promises: XDPromise<void>[] = [];
        udfSet.forEach((moduleName) => {
            if (moduleName !== "default") {
                promises.push(upload(moduleName));
            }
        });
        return PromiseHelper.when(...promises);
    }

    private _getSeriazliedGraphToSave(): string {
        // create a new copy of the graph and clean it up
        const graph: DagGraph = new DagGraph();
        const searizliedInfo: string = this._dagGraph.serialize();
        if (!graph.deserializeDagGraph(searizliedInfo)) {
            return null;
        }
        // reset state and clear tables
        // Not that it should not delte the tables as it's just a copy
        graph.resetStates();
        return graph.serialize();
    }
}