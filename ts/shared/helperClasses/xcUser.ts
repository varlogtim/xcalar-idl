
class XcUser {
    private static _currentUser: XcUser;

    public static get CurrentUser(): XcUser {
        return this._currentUser;
    }

    /**
     * Xcuser.getCurrentUserName
     */
    public static getCurrentUserName(): string {
        return this._currentUser.getName();
    }

    /**
     * Xcuser.setCurrentUser, this function call only be called once
     */
    public static setCurrentUser(): XDPromise<void> {
        if (this._currentUser != null) {
            // when already set, skip
            return PromiseHelper.reject("Current user already exists");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let setCurrentUserHelper: Function = (username, isAdmin) => {
            const posingUser: string = xcSessionStorage.getItem("usingAs");
            if (posingUser != null) {
                username = posingUser;
                isAdmin = false;
            }
            const user: XcUser = new this(username, isAdmin);
            this._currentUser = user;
            XcUser.setUserSession(user);
            XcUser.CurrentUser.idleCheck();
        };

/** START DEBUG ONLY **/
        if (typeof gLoginEnabled !== "undefined" && gLoginEnabled === false ||
            xcSessionStorage.getItem("gLoginEnabled") === "false") {
            const username = xcSessionStorage.getItem("xcalar-username");
            if (username != null) {
                const isAdmin = xcSessionStorage.getItem("xcalar-admin") === "true";
                setCurrentUserHelper(username, isAdmin);
                deferred.resolve();
                return deferred.promise();
            } else {
                xcManager.forceLogout();
            }
        }
/** END DEBUG ONLY **/
        XcUser.checkCurrentUser()
        .then((data) => {
            setCurrentUserHelper(data.emailAddress, data.admin);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XcUser.checkCurrentUser
     */
    public static checkCurrentUser(): XDPromise<{emailAddress: string, admin: boolean}> {
/** START DEBUG ONLY **/
        if (typeof gLoginEnabled !== "undefined" && gLoginEnabled === false ||
            xcSessionStorage.getItem("gLoginEnabled") === "false") {
                // skip check in this case
                return PromiseHelper.resolve();
        }
/** END DEBUG ONLY **/
    const deferred: XDDeferred<{emailAddress: string, admin: boolean}> = PromiseHelper.deferred();

        HTTPService.Instance.ajax({
            "type": "GET",
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + "/auth/sessionStatus",
            "success": function(data) {
                try {
                    if (data.loggedIn === true) {
                        deferred.resolve(data);
                    } else  {
                        xcManager.forceLogout();
                        deferred.reject("Authentication Fails");
                    }
                } catch (e) {
                    console.error(e);
                    deferred.reject("Authentication Fails");
                }
            },
            "error": function(e) {
                console.error(e);
                deferred.reject("Authentication Error");
            }
        });

        return deferred.promise();
    }

    /**
     * XcUser.setUserSession
     * @param user
     */
    public static setUserSession(user: XcUser): void {
        if (user._username == null) {
            throw "Invalid User";
        }
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
    private _isAdmin: boolean;
    private _userIdUnique: number;
    private _isIdle: boolean;
    private _idleChckTimer: number;

    private _commitFlag: string;
    private _defaultCommitFlag: string = "commit-default";

    public constructor(username: string, isAdmin = false) {
        this._fullUsername = username;
        this._isAdmin = isAdmin;
        this.setName();
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
    
    /**
     * 
     * @param stripEmail {boolean} strip email address or not
     * @param collab {boolean} is in collobation mode or not
     */
    public setName(stripEmail: boolean = false, collab: boolean = false) {
        try {
            let username: string = this._fullUsername;
            if (stripEmail) {
                username = this.stripCharFromUserName(this._username, "@");
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

    /**
     * @returns {boolean} true if the user is an admin, false otherwise
     */
    public isAdmin(): boolean {
        return this._isAdmin;
    }

    /**
     * logout current user
     */
    public logout(): void {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }
        XcSocket.Instance.sendMessage("logout", {
            user: this.getName()
        });
        this._removeCookies();
        xcManager.unload();
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
        const hasHeartbeatCheck: boolean = XcSupport.hasHeartbeatCheck();
        if (hasHeartbeatCheck) {
            XcSupport.stopHeartbeatCheck();
        }

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
            .fail(deferred.reject)
            .always(() => {
                if (hasHeartbeatCheck) {
                    XcSupport.restartHeartbeatCheck();
                }
            });

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
        XcSupport.stopHeartbeatCheck();
        promise
            .then(() => {
                return this.setCommitFlag(this._defaultCommitFlag);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
    * XcUser.CurrentUser.commitCheck
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

    /**
     * Check if use has idle for 25 minutes or not,
     * if yes, logout the user, otherwise, extend the cookies
     * Note that cookies will expire in 30 minutes, so here we
     * check every 25 minutes to ensure it can be extended
     */
    public idleCheck(): void {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        this._isIdle = true;
        $(document).on("mousemove.idleCheck", () => {
            // as long as there is mouse move action, mark as not idle
            this._isIdle = false;
            $(document).off("mousemove.idleCheck");
        });
        this._idleChecker();
    }

    public disableIdleCheck(): void {
        console.info("idle check is disabled!");
        clearTimeout(this._idleChckTimer);
    }

    private _idleChecker(): void {
        const checkTime: number = 25 * 60 * 1000; // 25 minutes
        clearTimeout(this._idleChckTimer);
        this._idleChckTimer = window.setTimeout(() => {
            if ($("#container").hasClass("locked")) {
                return; // if it's error, skip the check
            } else if (this._isIdle) {
                this.logout();
            } else {
                XcUser.checkCurrentUser(); // extend cookies
                this.idleCheck(); // reset the check
            }
        }, checkTime);
    }

    private commitMismatchHandler(): void {
        XcSupport.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
        // user should force to logout
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
            title: AlertTStr.Title,
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
                className: "cancel larger",
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

    private _removeCookies(): void {
        // to remove the cookies
        HTTPService.Instance.ajax({
            "type": "POST",
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + "/logout"
        });
    }
}