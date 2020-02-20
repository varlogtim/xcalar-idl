class AppList extends Durable {
    private static _instance: AppList;
    private static _uid: XcUID;

    public static generateId(): string {
        this._uid = this._uid || new XcUID("App");
        return this._uid.gen();
    }

    public static get Instance() {
        return this._instance || (this._instance = new AppList());
    }

    private _apps: AppDurable[];

    private constructor() {
        super(null);
        this._apps = [];
    }

    /**
     * AppList.Instance.list
     */
    public list(): AppDurable[] {
        return this._apps;
    }

    /**
     * AppList.Instance.restore
     */
    public restore(): Promise<void> {
        return this._restore();
    }

    /**
     * AppList.Instance.createApp
     */
    public createApp(name: string, graph?: DagGraph): void {
        return this._createApp(name, null, graph);
    }

    /**
     * AppList.Instance.delete
     */
    public delete(appId: string): void {
        const app: AppDurable = this._getAppById(appId);
        if (app == null) {
            return;
        }
        const msg = `Are you sure you want to delete app "${app.name}"?`;
        Alert.show({
            title: "Delete App",
            msg,
            onConfirm: () => {
                this._deleteApp(app.id);
            }
        });
    }

    /**
     * AppList.Instance.getAppPath
     * @param appId
     * @param name
     */
    public getAppPath(appId: string, name: string): string {
        for (let app of this._apps) {
            if (app.id === appId) {
                return `/${app.name}/${name}`;
            }
        }
        return name;
    }

    /**
     * AppList.Instance.getValidName
     * @param name
     */
    public getValidName(name: string | null): string {
        let cnt = 0;
        let validName = name;
        if (name == null) {
            name = "app";
            cnt = 1;
            validName = name + cnt;
        }
        let set: Set<string> = new Set();
        for (let app of this._apps) {
            set.add(app.name);
        }
        while (set.has(validName)) {
            cnt++;
            validName = name + cnt;
        }
        return validName;
    }

    public serialize(): string {
        return JSON.stringify(this._getDurable());
    }

    protected _getDurable(): AppListDurable {
        return {
            apps: this._apps
        };
    }

    private async _restore(): Promise<void> {
        const res = await this._getKVStore().getAndParse()
        if (res != null) {
            this._apps = res.apps;
        }
    }

    private async _save(): Promise<void> {
        const jsonStr = this.serialize();
        return this._getKVStore().put(jsonStr, true);
    }

    private _has(name: string): boolean {
        for (let app of this._apps) {
            if (app.name === name) {
                return true;
            }
        }
        return false;
    }

    private _createApp(name: string, id?: string, graph?: DagGraph): void {
        if (this._has(name)) {
            return;
        }
        id = id || AppList.generateId();
        this._apps.push({
            id,
            name
        });
        this._save();
        this._refreshMenuList();
        this._createMainTab(id, graph);
    }

    private _createMainTab(app: string, graph?: DagGraph): void {
        const name: string = DagList.Instance.getValidName("Main", undefined, undefined, undefined, app);
        if (!graph) {
            graph = new DagGraph();
        }

        // graph.addMainNode();
        const mainTab: DagTabMain = new DagTabMain({
            app,
            name: name,
            dagGraph: graph,
            createdTime: xcTimeHelper.now()
        });
        if (!DagList.Instance.addDag(mainTab)) {
            return;
        }
        mainTab.save();
    }

    private _getAppById(id: string): AppDurable | null {
        for (let app of this._apps) {
            if (app.id === id) {
                return app;
            }
        }
        return null;
    }

    private _getKVStore(): KVStore {
        const key: string = KVStore.getKey("gAppListKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private _deleteApp(appId: string): void {
        DagList.Instance.deleteDataflowsByApp(appId);
        SQLSnippet.Instance.deleteByApp(appId);
        for (let i = 0; i < this._apps.length; i++) {
            if (this._apps[i].id === appId) {
                this._apps.splice(i, 1);
                this._save();
                break;
            }
        }
        this._refreshMenuList();
    }

    private _refreshMenuList(): void {
        DagList.Instance.refreshMenuList(ResourceMenu.KEY.App);
    }
}