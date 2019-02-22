class DagSharedActionService {
    private static _instance: DagSharedActionService;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public events: { on: Function, trigger: Function};
    private _events: object;
    private _receivedMessages: Map<string, any[]> // tabId to messageQueue
    private _lockedDataflow: Set<string>;

    private constructor() {
        this._events = {};
        this._receivedMessages = new Map();
        this._lockedDataflow = new Set();
    }

    public on(
        event: string,
        callback: Function
    ): DagSharedActionService {
        this._events[event] = callback;
        return this;
    }

    public queueRegister(dagTab: DagTabPublished): void {
        this._receivedMessages.set(dagTab.getId(), []);
    }

    public queueUnResiger(dagTab: DagTabPublished): void {
        const tabId: string = dagTab.getId();
        const queuedMessages = this._receivedMessages.get(tabId) || [];
        queuedMessages.forEach((arg) => {
            this.receive(arg);
        });
        this._receivedMessages.delete(dagTab.getId());
    }

    public broadcast(event: string, arg: object): void {
        const activeWKBK: string = WorkbookManager.getActiveWKBK();
        arg = $.extend({}, arg, {
            user: XcUser.getCurrentUserName(),
            workbook: activeWKBK,
            event: event
        });
        XcSocket.Instance.sendMessage("refreshDataflow", arg);
    }

    public receive(arg: any): void {
        try {
            if (arg.user == XcUser.getCurrentUserName() &&
                arg.workbook === WorkbookManager.getActiveWKBK()
            ) {
                // not upate the workbook who send the message
                return;
            }
            const tabId: string = arg.tabId;
            const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
            if (tab == null) {
                const queue: any[] = this._receivedMessages.get(tabId);
                if (queue != null) {
                    console.info("queue message", arg);
                    queue.push(arg);
                }
                // when tab not load
                return;
            }
            const event: string = arg.event;
            arg = this._messageAdapter(tab, arg);
            this._trigger(event, arg);

            if (event === DagGraphEvents.LockChange) {
                if (arg.lock) {
                    this._lockedDataflow.add(arg.tabId);
                } else {
                    this._lockedDataflow.delete(arg.tabId);
                }
            } else if (event === DagGraphEvents.DeleteGraph) {
                this._deleteGraphEvent(tab);
            }
        } catch (e) {
            console.error(e);
        }
    }

    public checkExecuteStatus(tabId: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const prefix: string = DagNodeExecutor.getTableNamePrefix(tabId);
        let isExecuting: boolean = false;
        let queryName: string = null;
        
        XcalarQueryList(prefix + "*")
        .then((res) => {
            if (res.queries.length > 0) {
                try {
                    queryName = res.queries[0].name;
                    return XcalarQueryState(queryName);
                } catch (e) {
                    console.log("error", e);
                }
            } else {
                return PromiseHelper.resolve(null);
            }
        })
        .then((queryStateOutput) => {
            if (queryStateOutput == null) {
                deferred.resolve(isExecuting);
            } else {
                try {
                    let state = queryStateOutput.queryState;
                    if (state === QueryStateT.qrNotStarted ||
                        state === QueryStateT.qrProcessing
                    ) {
                        isExecuting = true;
                    } else {
                        XcalarQueryDelete(queryName);
                    }
                } catch (e) {
                    console.error(e);
                }
                deferred.resolve(isExecuting);
            }
        })
        .fail(() => {
            // when queryList fails, we rely on socket signal to tell
            let isExecuting: boolean = this._lockedDataflow.has(tabId);
            deferred.resolve(isExecuting);
        });
        return deferred.promise();
    }

    private _trigger(event, ...args) {
        if (typeof this._events[event] === 'function') {
            this._events[event].apply(this, args)
        }
    }

    private _messageAdapter(tab: DagTab, arg: any): any {
        try {
            arg.tab = tab;
            switch (arg.event) {
                case DagNodeEvents.StateChange:
                    const nodeId: DagNodeId = arg.nodeId;
                    const dagNode: DagNode = tab.getGraph().getNode(nodeId);
                    arg.oldState = dagNode.getState();
                    arg.id = nodeId;
                    arg.node = dagNode;
                    return arg;                    
                default:
                    return arg;
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _deleteGraphEvent(tab: DagTabPublished): void {
        DagList.Instance.removePublishedDagFromList(tab);
        tab.deletedAlert();
    }
}