
class XcUser {
    private static _currentUser: XcUser;

    public static get CurrentUser(): XcUser {
        return this._currentUser;
    }

    public static getCurrentUserName(): string {
        return this._currentUser.getName();
    }

    /**
     * XcUser.setCurrentUser
     * @param stripEmail
     */
    public static setCurrentUser(stripEmail: boolean): void {
        const username: string = xcSessionStorage.getItem("xcalar-username");
        const user: XcUser = new this(username, stripEmail, gCollab);
        this._currentUser = user;
        this.setUserSession(user);
    }

    /**
     * XcUser.setUserSession
     * @param user
     */
    public static setUserSession(user: XcUser): void {
        userIdName = user._username;
        userIdUnique = user._userIdUnique;
    }

    /**
     * XcUser.resetUserSession
     */
    public static resetUserSession(): void {
        this.setUserSession(this._currentUser);
    }

    private _username: string;
    private _fullUsername: string;
    private _userIdUnique: number;

    private _commitFlag: string;
    private _defaultCommitFlag: string = "commit-default";

    public constructor(username: string, stripEmail: boolean = false, collab: boolean = false) {
        try {
            this._fullUsername = username;

            if (stripEmail) {
                username = this.stripCharFromUserName(username, "@");
            }
            if (collab) {
                username = this.stripCharFromUserName(username, "/");
            }
            this._username = username;
            this._userIdUnique = this.getUserIdUnique(username);
        } catch (error) {
            console.error(error);
        }
    }

    public getName(): string {
        return this._username;
    }

    public getFullName(): string {
        return this._fullUsername;
    }

    public getMemoryUsage(): XDPromise<any> {
        return XcalarGetMemoryUsage(this._username, this._userIdUnique);
    }

    public holdSession(
        workbookId: string,
        alreadyStarted: boolean
    ): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        const username: string = this._username;
        if (workbookId == null) {
            xcSessionStorage.removeItem(username);
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const xcSocket: XcSocket = XcSocket.Instance;
        const promise: XDPromise<boolean> = (alreadyStarted === true)
            ? PromiseHelper.resolve(false)
            : xcSocket.checkUserSessionExists(workbookId);

        promise
            .then(this.sessionHoldAlert)
            .then(() => {
                xcSessionStorage.removeItem(username);
                if (!alreadyStarted) {
                    xcSocket.registerUserSession(workbookId);
                }
                this._commitFlag = this.randCommitFlag();
                // hold the session
                return this.setCommitFlag(this._commitFlag);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    public releaseSession(): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // when setup fails and logout, should not commit
        // (the module even didn't setup yet)
        const promise: XDPromise<void> = xcManager.isStatusFail()
            ? PromiseHelper.resolve()
            : KVStore.commit();
        promise
            .then(() => {
                return this.setCommitFlag(this._defaultCommitFlag);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
    * XcSupport.commitCheck
    * @param isFromHeatbeatCheck
    */
    public commitCheck(isFromHeatbeatCheck: boolean = false): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        const wkbkId: string = WorkbookManager.getActiveWKBK();
        if (this.getCommitKey() == null || wkbkId == null) {
            // when workbook is not set up yet or no workbook yet
            return PromiseHelper.resolve();
        }

        const workbook: WKBK = WorkbookManager.getWorkbook(wkbkId);
        if (workbook == null || workbook.getName() !== sessionName) {
            // it's doing some operation on other workbook
            // skip checking in this case
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const commitCheckError: string = "commit key not match";
        const cancelCheck: string = "cancel check";
        const kvStore = this.getCommitKeyKVStore();

        kvStore.get()
            .then((val) => {
                if (isFromHeatbeatCheck && !XcSupport.hasHeartbeatCheck()) {
                    deferred.reject(cancelCheck);
                } else if (val == null || val !== this._commitFlag) {
                    this.commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail((error) => {
                if (isFromHeatbeatCheck && !XcSupport.hasHeartbeatCheck()) {
                    deferred.reject(cancelCheck);
                } else if (error.status === StatusT.StatusSessionNotFound) {
                    this.commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.reject(error);
                }
            });

        return deferred.promise();
    }

    private commitMismatchHandler(): void {
        XcSupport.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
        // user should force to logout
        xcSessionStorage.removeItem("xcalar-username");

        Alert.show({
            title: WKBKTStr.Expire,
            msg: WKBKTStr.ExpireMsg,
            lockScreen: true,
            logout: true
        });
    }

    private stripCharFromUserName(name: string, ch: string): string {
        const atIndex: number = name.indexOf(ch);
        if (atIndex > 0) {
            name = name.substring(0, atIndex);
        }
        return name;
    }

    private getUserIdUnique(name: string): number {
        const hash: string = jQuery.md5(name);
        const len: number = 5;
        const id: number = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }

    private sessionHoldAlert(userExist: boolean): XDPromise<void> {
        if (!userExist) {
            return PromiseHelper.resolve();
        }

        const lastLogInTime: number = Number(xcSessionStorage.getItem(XcUser.getCurrentUserName()));
        // 25000 is the pingInterval for socket io if it's long polling
        // see: https://socket.io/docs/server-api/
        if (lastLogInTime && new Date().getTime() - lastLogInTime <= 25000) {
            // in this case consider as a refresh case
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $initScreen: JQuery = $("#initialLoadScreen");
        const isVisible: boolean = $initScreen.is(":visible");
        if (isVisible) {
            $initScreen.hide();
        }
        // when seesion is hold by others
        Alert.show({
            title: WKBKTStr.Hold,
            msg: WKBKTStr.HoldMsg,
            buttons: [{
                name: CommonTxtTstr.Back,
                className: "cancel",
                func: function() {
                    deferred.reject(WKBKTStr.Hold);
                }
            },
            {
                name: WKBKTStr.Release,
                className: "cancel",
                func: function() {
                    if (isVisible) {
                        $initScreen.show();
                    }
                    deferred.resolve();
                }
            }],
            noCancel: true
        });

        return deferred.promise();
    }

    private randCommitFlag(): string {
        return "commit" + Math.floor((Math.random() * 10000) + 1);
    }

    private setCommitFlag(value: string): XDPromise<void> {
        const kvStore: KVStore = this.getCommitKeyKVStore();
        return kvStore.put(value, false, true);
    }

    private getCommitKey(): string {
        return KVStore.getKey("commitKey");
    }

    private getCommitKeyKVStore(): KVStore {
        const key: string = this.getCommitKey();
        return new KVStore(key, gKVScope.WKBK);
    }
}