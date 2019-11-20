class SQLSnippet {
    private static _instance: SQLSnippet;
    public static readonly Default: string = "Default Snippet";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _snippets: {[key: string]: string};
    private _fetched: boolean;

    private constructor() {
        this._snippets = {};
        this._fetched = false;
    }

    public listSnippets(): {name: string, snippet: string}[] {
        let names: string[] = this._listSnippetsNames();
        let snippets = this._snippets;
        let res: {name: string, snippet: string}[] = names.map((name) => {
            return {
                name: name,
                snippet: snippets[name] || ""
            };
        });

        return res;
    }

    public listSnippetsAsync(): XDPromise<{name: string, snippet: string}[]> {
        const deferred: XDDeferred<{name: string, snippet: string}[]> = PromiseHelper.deferred();
        this._fetchSnippets()
        .then(() => {
            let res = this.listSnippets();
            deferred.resolve(res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getSnippet(snippet: string): string {
        return this._snippets[snippet] || "";
    }

    public hasSnippet(snippetName: string): boolean {
        return this._snippets.hasOwnProperty(snippetName);
    }

    public writeSnippet(
        snippetName: string,
        snippet: string,
        overwrite: boolean
    ): XDPromise<void> {
        if (!overwrite && this.hasSnippet(snippetName)) {
            return PromiseHelper.reject();
        }
        this._snippets[snippetName] = snippet;
        if (snippetName === SQLSnippet.Default) {
            return PromiseHelper.resolve();
        }
        return this._updateSnippets();  
    }

    public deleteSnippet(snippetName: string): XDPromise<void> {
        if (!this.hasSnippet(snippetName)) {
            return PromiseHelper.resolve();
        }

        delete this._snippets[snippetName];
        return this._updateSnippets();
    }

    // TODO: imrove this. Ideally should set to the last snippet
    public setFirstSnippet(): void {
        this._fetchSnippets()
        .then(() => {
            const snippetNames = this._listSnippetsNames();
            if (snippetNames && snippetNames[0] !== "Untitled") {
                SQLEditorSpace.Instance.setSnippet(snippetNames[0])
            }
        })
    }

    private _getKVStore(): KVStore {
        let snippetQueryKey: string = KVStore.getKey("gSQLSnippetQuery");
        return new KVStore(snippetQueryKey, gKVScope.WKBK);
    }

    private _listSnippetsNames(): string[] {
        let names: string[] = [];
        let snippets = this._snippets;
        for (let key in snippets) {
            if (key === SQLSnippet.Default) {
                // skip
                continue;
            }
            names.push(key);
        }

        names.sort((a, b) => {
            a = a.toLowerCase();
            b = b.toLowerCase();
            return (a < b ? -1 : (a > b ? 1 : 0));
        });
        return names;
    }

    private _fetchSnippets(): XDPromise<void> {
        if (this._fetched) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let kvStore = this._getKVStore();

        kvStore.getAndParse()
        .then((res) => {
            if (res != null) {
                this._fetched = true;
                this._snippets = res;
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateSnippets(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let kvStore = this._getKVStore();
        let snippet = xcHelper.deepCopy(this._snippets);
        delete snippet[SQLSnippet.Default];
        kvStore.put(JSON.stringify(snippet), true)
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

}