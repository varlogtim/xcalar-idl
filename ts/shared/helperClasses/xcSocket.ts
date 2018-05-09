interface UserOption {
    user: string;
    id: string;
}

class XcSocket {
    private static _instance: XcSocket;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _socket: SocketIOClient.Socket;
    private _connected: boolean;
    private _isRegistered: boolean;
    private _initDeferred: XDDeferred<void>;

    private constructor() {
        this._socket = null;
        this._connected = false;
        this._isRegistered = false; // becomes true when has an active wkbk
        this._initDeferred = null;
    }

    /**
     * xcSocket.setup
     */
    public setup(): void {
        this._initDeferred = PromiseHelper.deferred();

        const url: string = this._getExpServerUrl(hostname);
        this._socket = io.connect(url, {
            "reconnectionAttempts": 10
        });
        this._addAuthenticationEvents();
        this._addWorkbookEvents();
    }

    public addEventsAfterSetup(): void {
        this._addSocketEvents();
    }

    public checkUserSessionExists(workbookId: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const initDeferred = this._initDeferred;
        // time out after 15s
        this._checkConnection(initDeferred, 15000);

        initDeferred.promise()
        .then(() => {
            const userOption: UserOption = this._getUserOption(workbookId);
            this._socket.emit('checkUserSession', userOption, (exist) => {
                deferred.resolve(exist);
            });

            // time out after 20s
            this._checkConnection(deferred, 20000, true);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public registerUserSession(workbookId: string): boolean {
        if (this._isRegistered) {
            console.warn("already registered");
            return false;
        }

        const userOption: UserOption = this._getUserOption(workbookId);
        this._socket.emit("registerUserSession", userOption, () => {
            console.log("registerSuccess!");
            this._isRegistered = true;
        });

        return true;
    }

    // when deactivating workbook
    public unregisterUserSession(workbookId: string): boolean {
        if (!this._isRegistered) {
            return false;
        }
        this._isRegistered = false;
        const userOption: UserOption = this._getUserOption(workbookId);
        this._socket.emit("unregisterUserSession", userOption, () => {
            console.log("unregisterSuccess!");
        });

        return true;
    }

    public isConnected(): boolean {
        return this._connected;
    };

    public isResigered(): boolean {
        return this._isRegistered;
    };

    public sendMessage(msg: string, arg: any, callback: Function): boolean {
        if (this._socket == null) {
            return false;
        }
        this._socket.emit(msg, arg, callback);
        return true;
    }

    private _getExpServerUrl(host: string): string {
        if (typeof expHost !== 'undefined' && expHost != null) {
            return expHost;
        }
        return host;
    }

    // receives events even if user is not in a workbook
    private _addWorkbookEvents(): void {
        const socket = this._socket;
        socket.on("refreshWorkbook", (info) => {
            // XXX socket should only send messages to relevant users
            WorkbookManager.updateWorkbooks(info);
        });
    }

    private _addAuthenticationEvents(): void {
        const socket = this._socket;
        socket.on('error', (error) => {
            console.log('error', error)
        });

        socket.on('connect', () => {
            this._connected = true;
            this._initDeferred.resolve();
        });

        socket.on('reconnect_failed', () => {
            console.error('connect failed');
            this._initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on('connect_timeout', (timeout) => {
            console.error('connect timeout', timeout);
            this._initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on('useSessionExisted', (userOption) => {
            if (!this._isRegistered) {
                return;
            }
            console.log(userOption, 'exists');
            if (userOption.user === XcSupport.getUser() &&
                userOption.id === WorkbookManager.getActiveWKBK()) {
                WorkbookManager.gotoWorkbook(null, true);
            }
        });

        socket.on('system-allUsers', (userInfos) => {
            if (!this._isRegistered) {
                return;
            }
            XVM.checkMaxUsers(userInfos);
            Admin.updateLoggedInUsers(userInfos);
        });

        socket.on('adminAlert', (alertOption) => {
            if (!this._isRegistered) {
                return;
            }
            Alert.show({
                title: alertOption.title,
                msg: alertOption.message,
                isAlert: true
            });
        });
    }

    private _addSocketEvents(): void {
        const socket = this._socket;
        socket.on('refreshDataflow', (dfName) => {
            if (!this._isRegistered) {
                return;
            }
            DataflowPanel.refresh(dfName);
            UDF.refreshWithoutClearing(false);
        });

        socket.on('refreshUDFWithoutClear', (overwriteUDF: boolean) => {
            if (!this._isRegistered) {
                return;
            }
            // In the event that there's new UDF added or overwrite old UDF
            UDF.refreshWithoutClearing(overwriteUDF);
        });

        socket.on('refreshDSExport', () => {
            if (!this._isRegistered) {
                return;
            }
            DSExport.refresh();
        });

        socket.on('ds.update', (arg) => {
            DS.updateDSInfo(arg);
        });

        socket.on("refreshUserSettings", () => {
            if (!this._isRegistered) {
                return;
            }
            UserSettings.sync();
        });

        socket.on("refreshIMD", (arg) => {
            if (!this._isRegistered) {
                return;
            }
            IMDPanel.updateInfo(arg);
        });
    }

    private _checkConnection(
        deferred: XDDeferred<any>,
        timeout: number,
        resolve: boolean = false
    ): void {
        setTimeout(() => {
            if (deferred.state() !== 'resolved') {
                if (resolve) {
                    console.error(AlertTStr.NoConnectToServer);
                    deferred.resolve();
                } else {
                    deferred.reject(AlertTStr.NoConnectToServer);
                }
            }
        }, timeout);
    }

    private _getUserOption(workbookId: string): UserOption {
        return {
            user: XcSupport.getUser(),
            id: workbookId
        };
    }
}