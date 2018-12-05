class DagSharedActionService {
    private static _instance: DagSharedActionService;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public events: { on: Function, trigger: Function};
    private _events: object;
    private _receivedMessages: Map<string, any[]> // tabId to messageQueue

    private constructor() {
        this._events = {};
        this._receivedMessages = new Map();
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
        } catch (e) {
            console.error(e);
        }
    }

    public checkExecuteStatus(tabId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const arg = {
            tabId: tabId
        };
        const valid: boolean = XcSocket.Instance.sendMessage("checkDataflowExecution", arg, (isExecuting) => {
            if (isExecuting) {
                deferred.reject(DFTStr.InExecution);
            } else {
                deferred.resolve();
            }
        });
        if (!valid) {
            deferred.reject(DFTStr.InExecution);
        }
        return deferred.promise();
    }

    private _trigger(event, ...args) {
        if (typeof this._events[event] === 'function') {
            this._events[event].apply(this, args)
        }
    }

    private _messageAdapter(tab: DagTab, arg: any): any {
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
    }
}