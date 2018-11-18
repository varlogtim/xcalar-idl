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
        DagTabShared._listSession()
        .then((res: {sessions: any[]}) => {
            const dags: DagTabShared[] = [];
            res.sessions.map((sessionInfo) => {
                const name: string = sessionInfo.name;
                if (!name.startsWith(".temp")) {
                    // filter out .temp dataflows
                    const id: string = sessionInfo.sessionId;
                    dags.push(new DagTabShared(name, id));

                    if (sessionInfo.state === "Inactive") {
                        this._activateSession(name);
                    }
                }
            });
            deferred.resolve(dags);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * @returns string
     */
    public static getSecretUser(): string {
        return this._secretUser;
    }

    private static _listSession(): XDPromise<{sessions: any[]}> {
        this._switchSession(null);
        const promise = XcalarListWorkbooks("*");
        this._resetSession();
        return promise;
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

    private static _activateSession(sessionName: string): void {
        // XXX TODO: remove it when backend support (13855, 14089)
        this._switchSession(null);
        const promise = XcalarActivateWorkbook(sessionName);
        this._resetSession();
        return promise;
    }

    public constructor(name: string, id?: string, graph?: DagGraph) {
        name = name.replace(new RegExp(DagTabShared._delim, "g"), "/");
        if (graph != null) {
            // should be a deep copy
            graph = graph.clone();
        }
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

    public getUDFContext(): {
        udfUserName: string,
        udfSessionName: string
    } {
        return {
            udfUserName: DagTabShared._secretUser,
            udfSessionName: this._getWKBKName()
        };
    }

    public getUDFDisplayPathPrefix(): string {
        return "/workbook/" + DagTabShared._secretUser + "/" + this._getWKBKName() + "/";
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
                this.setGraph(savedGraph);
            } else {
                this._unsaved = tempDagInfo.unsaved;
                this._version = tempDagInfo.version;
                this.setGraph(tempGraph);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public save(forceSave: boolean = false): XDPromise<void> {
        if (this._disableSave) {
            return PromiseHelper.resolve();
        }

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
        this._deleteTableHelper()
        .then(() => {
            return this._deleteWKBK();
        })
        .then(() => {
            return PromiseHelper.alwaysResolve(this._tempKVStore.delete());
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (error.status === StatusT.StatusSessionNotFound) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

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
            // XXX TODO: remove it when backend support (13855, 14089)
            const wkbkNmae: string = this._getWKBKName();
            return DagTabShared._activateSession(wkbkNmae);
        })
        .then(() => {
            return this._writeToKVStore();
        })
        .then(() => {
            return this._uploadLocalUDFToShared();
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

    public copyUDFToLocal(overwrite: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let udfPathPrefix: string;

        this._fetchId()
        .then((id) => {
            if (id == null) {
                // this is an error case
                return PromiseHelper.reject({error: "Error Dataflow"});
            }
            this._id = id;
            
            udfPathPrefix = `/workbook/${DagTabShared._secretUser}/${id}/udf/`;
            const udfPattern: string = udfPathPrefix + "*";
            return XcalarListXdfs(udfPattern, "User*");
        })
        .then((res) => {
            const udfAbsolutePaths = {};
            const prefixLen: number = udfPathPrefix.length;
            res.fnDescs.forEach((fnDesc) => {
                const path = fnDesc.fnName.split(":")[0];
                const moduelName = path.substring(prefixLen);
                udfAbsolutePaths[path] = moduelName;
            });
            return this._downloadShareadUDFToLocal(udfAbsolutePaths, overwrite)
        })
        .then(() => {
            UDFFileManager.Instance.refresh(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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
        dag: DagGraphInfo,
        autoSave: boolean,
        version: number,
        unsaved?: boolean
    } {
        const json: {
            name: string,
            id: string,
            dag: DagGraphInfo,
            autoSave: boolean,
            version: number,
            unsaved?: boolean
        } = <any>super._getJSON();
        json.version = this._version;
        if (forceSave) {
            json.dag = this._getSerializableGraphToSave();
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
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // XXX TODO Should not require deactivate (bug 14090)
        PromiseHelper.alwaysResolve(this._deactivateHelper())
        .then(() => {
            DagTabShared._switchSession(null);
            const promise = XcalarDeleteWorkbook(this._getWKBKName());
            DagTabShared._resetSession();
            return promise;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _deactivateHelper(): XDPromise<void> {
        DagTabShared._switchSession(null);
        const promise = XcalarDeactivateWorkbook(this._getWKBKName());
        DagTabShared._resetSession();
        return promise;
    }

    private _uploadLocalUDFToShared(): XDPromise<void> {
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

    private _downloadShareadUDFToLocal(
        udfAbsolutePaths: object,
        overwrite: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const failures: string[] = [];

        let upload = (udfPath: string, moduleName: string): XDPromise<void> => {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let udfStr: string = null;
            XcalarDownloadPython(udfPath)
            .then((res) => {
                udfStr = res;
                if (udfStr == null) {
                    // nothing to upload
                    return;
                }

                let promise = null;
                if (overwrite) {
                    promise = XcalarUploadPython(moduleName, udfStr);
                } else {
                    promise = XcalarUploadPythonRejectDuplicate(moduleName, udfStr);
                }
                return promise;
            })
            .then(() => {
                innerDeferred.resolve();
            })
            .fail((error) => {
                console.error("Upload UDF to local fails", error);
                failures.push(moduleName + ": " + error.error);
                innerDeferred.resolve(); // still resolve it
            });

            return innerDeferred.promise();
        }

        const promises: XDPromise<void>[] = [];
        for (let path in udfAbsolutePaths) {
            promises.push(upload(path, udfAbsolutePaths[path]));
        }

        PromiseHelper.when(...promises)
        .then(() => {
            if (failures.length > 0) {
                deferred.reject({
                    error: failures.join("\n")
                });
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject)
        return deferred.promise();
    }

    private _getSerializableGraphToSave(): DagGraphInfo {
        // create a new copy of the graph and clean it up
        const graph: DagGraph = this._dagGraph.clone();
        // reset state and clear tables
        // Not that it should not delte the tables as it's just a copy
        graph.resetStates();
        return graph.getSerializableObj();
    }

    private _fetchId(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        DagTabShared._listSession()
        .then((res: {sessions: any[]}) => {
            let id: string = null;
            const name: string = this._getWKBKName();
            res.sessions.forEach((sessionInfo) => {
                if (name === sessionInfo.name) {
                    id = sessionInfo.sessionId;
                    return false; // stop loop
                }
            });
            deferred.resolve(id);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}