class DagTabShared extends DagTab {
    // XXX TODO: encrypt it
    private static readonly _secretUser: string = ".xcalar.shared.df";
    private static readonly _delim: string = "_Xcalar_";
    private static _currentSession: string;

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
    }

    public getName(): string {
        return this._name;
    }

    public getShortName(): string {
        const name: string = this.getName();
        const splits: string[] = name.split("/");
        return splits[splits.length - 1];
    }

    public load(): XDPromise<void> {
        DagTabShared._switchSession(this._getWKBKName());
        const promise = this._loadFromKVStore();
        DagTabShared._resetSession();
        return promise;
    }

    public save(): XDPromise<void> {
        // create a new copy of the graph and clean it up
        const graph: DagGraph = new DagGraph();
        const searizliedInfo: string = this._dagGraph.serialize();
        if (!graph.deserializeDagGraph(searizliedInfo)) {
            return PromiseHelper.reject("Invalid dataflow structure");
        }
        // reset state and clear tables
        // Not that it should not delte the tables as it's just a copy
        graph.resetStates();
        this._dagGraph = graph;
        DagTabShared._switchSession(this._getWKBKName());
        const promise = this._writeToKVStore();
        DagTabShared._resetSession();
        return promise;
    }

    // XXX TODO
    public overwrite(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public delete(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabShared._switchSession(null);
        XcalarDeleteWorkbook(this._getWKBKName())
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

    public download(): XDPromise<void> {
        const fileName: string = this.getShortName() + ".tar.gz";
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
            return this.save();
        })
        .then(() => {
            return this._uploadUDFToWKBK();
        })
        .then(deferred.resolve)
        .fail((error) => {
            if (hasCreatWKBK) {
                // if fails and workbook has created
                // delete it as a rollback
                this._deleteWKBK();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    } 

    private _getWKBKName(): string {
        return this._name.replace(/\//g, DagTabShared._delim);
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
        let upload = (moduleName: string): XDPromise<void> => {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            UDFFileManager.Instance.getEntireUDF(moduleName)
            .then((udfStr) => {
                // XXX TODO: use absolute path
                DagTabShared._switchSession(this._getWKBKName());
                const promise = XcalarUploadPython(moduleName, udfStr);
                DagTabShared._resetSession();
                return promise();
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
}