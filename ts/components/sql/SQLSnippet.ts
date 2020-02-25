class SQLSnippet {
    private static _instance: SQLSnippet;
    private static _uid: XcUID;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public static generateId(): string {
        this._uid = this._uid || new XcUID("Snippet");
        return this._uid.gen();
    }

    /**
     * SQLSnippet.getAppPath
     * @param snippetObj
     */
    public static getAppPath(snippetObj: SQLSnippetDurable): string {
        if (snippetObj.app == null) {
            return snippetObj.name;
        }
        return AppList.Instance.getAppPath(snippetObj.app, snippetObj.name);
    }

    private _snippets: SQLSnippetDurable[];
    private _fetched: boolean;

    private constructor() {
        this._snippets = [];
        this._fetched = false;
    }

    /**
     * SQLSnippet.Instance.load
     */
    public async load(): Promise<void> {
        return this._fetchSnippets();
    }

    /**
     * SQLSnippet.Instance.create
     * @param name
     */
    public create(name: string | null): string {
        name = this.getValidName(name);
        const id: string = SQLSnippet.generateId();
        this._snippets.push({
            id,
            name,
            snippet: "",
            app: null
        });
        this._updateSnippets();
        return id;
    }

    /**
     * SQLSnippet.Instance.list
     */
    public list(): SQLSnippetDurable[] {
        return this._snippets;
    }

    /**
     * SQLSnippet.Instance.getSnippetObj
     * @param id
     */
    public getSnippetObj(id: string): SQLSnippetDurable | null {
        return this._getSnippetObjectById(id);
    }

    /**
     * SQLSnippet.Instance.hasSnippet
     * @param snippetName
     */
    public hasSnippet(name: string): boolean {
        for (let snippetObj of this._snippets) {
            if (snippetObj.name === name) {
                return true;
            }
        }
        return false;
    }

    /**
     * SQLSnippet.Instance.update
     * @param snippetName
     * @param snippet
     */
    public async update(
        id: string,
        snippet: string
    ): Promise<void> {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null) {
            return;
        }
        snippetObj.snippet = snippet;
        return this._updateSnippets();
    }

    /**
     * SQLSnippet.Instance.delete
     * @param id
     */
    public delete(id: string): void {
        this._deletSnippet(id);
        this._refresh();
    }

    /**
     * SQLSnippet.Instance.deleteByApp
     * @param appId
     */
    public deleteByApp(appId: string): void {
        const toDelete: string[] = [];
        this._snippets.forEach((snippetObj) => {
            if (snippetObj.app === appId) {
                toDelete.push(snippetObj.id);
            }
        });

        toDelete.forEach((id) => { this._deletSnippet(id); });
    }

    /**
     * SQLSnippet.Instance.rename
     * @param id
     * @param oldName
     * @param newName 
     */
    public rename(id: string, newName: string): void {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null || this.hasSnippet(newName)) {
            return;
        }
        snippetObj.name = newName;
        this._refresh();
        this._updateSnippets();
    }

    /**
     * SQLSnippet.Instance.download
     * @param id
     */
    public download(id: string): void {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null) {
            return;
        }
        const fileName: string = snippetObj.name + ".sql";
        const content: string = snippetObj.snippet;
        xcHelper.downloadAsFile(fileName, content);
    }

    /**
     * SQLSnippet.Instance.getValidName
     * @param name
     */
    public getValidName(name: string | null): string {
        name = name || CommonTxtTstr.Untitled;
        let cnt = 0;
        let validName = name;
        while (this.hasSnippet(validName)) {
            cnt++;
            validName = name + cnt;
        }
        return validName;
    }

    private _getKVStore(): KVStore {
        let snippetQueryKey: string = KVStore.getKey("gSQLSnippetQuery");
        return new KVStore(snippetQueryKey, gKVScope.WKBK);
    }

    private async _fetchSnippets(): Promise<void> {
        if (this._fetched) {
            return;
        }

        try {
            const res: SQLSnippetListDurable = await this._getKVStore().getAndParse();
            if (res != null) {
                this._fetched = true;
                
                if (!res.snippets) {
                    // XXX a upgrade case that should be deprecated
                    for (let key in res) {
                        const snippet = {
                            id: SQLSnippet.generateId(),
                            name: key,
                            snippet: res[key],
                            app: null
                        };
                        this._snippets.push(snippet)
                    }
                } else {
                    this._snippets = res.snippets;
                }
            }
        } catch (e) {
            console.error("fail sql snippet fails", e);
        }
    }

    private _getDurable(): SQLSnippetListDurable {
        return {
            snippets: this._snippets
        };
    }

    private _getSnippetObjectById(id: string): SQLSnippetDurable | null {
        for (let snippet of this._snippets) {
            if (snippet.id === id) {
                return snippet;
            }
        }
        return null;
    }

    private async _updateSnippets(): Promise<void> {
        const jsonStr = JSON.stringify(this._getDurable());
        await this._getKVStore().put(jsonStr, true);
    }

    private async _deletSnippet(id: string): Promise<void> {
        SQLTabManager.Instance.closeTab(id);
        const index: number = this._snippets.findIndex((snippetObj) => snippetObj.id === id);
        if (index > -1) {
            this._snippets.splice(index, 1);
            return this._updateSnippets();
        }
    }

    private _refresh(): void {
        DagList.Instance.refreshMenuList(ResourceMenu.KEY.SQL);
    }
}