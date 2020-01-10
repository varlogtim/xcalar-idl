// XVM = Xcalar Version Manager
namespace XVM {
    let majorVersion: string = "2";
    let minorVersion: string = "2";
    let revisionVersion: string = "0";

    let kvVersion: KVVersion;
    let kvVersionStore: KVStore;
    let backendVersion: string = '';
    let licenseExpireInfo: string = '';
    let licenseMode: XcalarMode = null;
    let licensee: string = 'Unknown';
    let compressedLicense: string = "Unknown";

    // let expirationDate: Date = null;
    let numUsers: number = -1; // Set, but not used
    let numNodes: number = -1; // Set, but not used
    let _mode: XVM.Mode;
    let _cloud: boolean;

    export enum Mode {
        SQL = "SQL",
        Advanced = "Advanced"
    }

    /* ==================== Helper Function ================================= */
    function showInvalidLicenseAlert(error: string): void {
        Alert.show({
            title: AlertTStr.LicenseErr,
            isAlert: true,
            msg: AlertTStr.LicenseErrMsg,
            detail: error
        });
    }

    function parseLicense(license: Xcrpc.License.LicenseInfo): string | null {
        try {
            if (typeof (license) === 'string') {
                // This is an error. Otherwise it will be an object
                licenseExpireInfo = 'Unlicensed';
            } else {
                const utcSeconds: number = parseInt(license.expiration);
                const d: Date = new Date(0);
                d.setUTCSeconds(utcSeconds);
                // expirationDate = d;
                licenseExpireInfo = d.toDateString();
                licenseMode = XcalarMode.Oper;
            }
            numNodes = license.nodeCount;
            numUsers = license.userCount;
            licensee = license.licensee;
            compressedLicense = license.compressedLicense;

            if (license.isExpired) {
                console.log(license);
                const error: string = xcStringHelper.replaceMsg(ErrTStr.LicenseExpire, {
                    date: licenseExpireInfo
                });
                return error;
            }
        } catch (error) {
            // code may go here if thrift changes
            console.error(error);
            return ThriftTStr.Update;
        }

        return null; // valid case
    }

    function parseKVStoreVersionInfo(info: string): KVVersionDurable {
        if (info == null) {
            return null;
        }

        try {
            return JSON.parse(info);
        } catch (error) {
            console.error("parse error", error);
            return null;
        }
    }

    function checkVersionInfo(versionInfo) {
        if (versionInfo == null) {
            kvVersion = new KVVersion();
        } else {
            kvVersion = new KVVersion(versionInfo);
        }
        kvVersion = new KVVersion(versionInfo);
        if (kvVersion.shouldStrimEmail()) {
            // need to redo the username setup
            XcUser.CurrentUser.setName(true);
            XcUser.setUserSession(XcUser.CurrentUser);
        }
    }

    function firstUserCheck(): XDPromise<void> {
        return XVM.commitKVVersion();
    }

    function parseVersionString(version: string): number[] {
        if (typeof version !== "string") {
            return [];
        }
        const stringArray = version.split("-")[0].split(".");
        const numberArray = stringArray.map(string => parseInt(string));
        if (numberArray.length === 0 || numberArray.includes(NaN)) {
            console.error("parseVersionString error");
            return [];
        }
        return numberArray;
    }
    /* ==================== End of Helper Function ========================== */

    /**
     * XVM.setup
     */
    export function setup(): void {
        const key: string = "xcalar-version-" + XcUser.getCurrentUserName();
        kvVersionStore = new KVStore(key, gKVScope.USER);
        _mode = XVM.Mode.SQL;
    }

    /**
     * XVM.getVersion
     */
    export function getVersion(includePatchVersion: boolean = false): string {
        const frontBuildNumber: string = XVM.getFrontBuildNumber();
        let version: string = `${majorVersion}.${minorVersion}.${revisionVersion}-${frontBuildNumber}`;
        if (includePatchVersion) {
            version += XVM.getPatchVersion();
        }
        return version;
    }

    /**
     * XVM.getSHA
     */
    export function getSHA(): string {
        return XcalarApiVersionTStr[XcalarApiVersionT.XcalarApiVersionSignature];
    }

    /**
     * XVM.getBackendVersion
     */
    export function getBackendVersion(): string {
        return backendVersion;
    }

    export function getNumServers(): number {
        return numNodes;
    }

    export function getNumUsers(): number {
        return numUsers;
    }

    export function getLicense(): string {
        return compressedLicense;
    }

    /**
     * XVM.getLicenseExipreInfo
     */
    export function getLicenseExipreInfo(): string {
        return licenseExpireInfo;
    }

    /**
     * XVM.getLicensee
     */
    export function getLicensee(): string {
        return licensee;
    }

    /**
     * XVM.getLicenseMode
     */
    export function getLicenseMode(): XcalarMode {
        // return (XcalarMode.Oper);
        // return (XcalarMode.Mod);
        return licenseMode;
    }

    /**
     * XVM.getFrontBuildNumber
     * @return(string): the front end cached build number
     */
    export function getFrontBuildNumber(): string {
        // build number is generated during the build process by Makefile and jenkins
        return (typeof gBuildNumber === "undefined") ? "git" : String(gBuildNumber);
    }

    /**
     * XVM.getBackBuildNumber
     * @return(string): the backend cached build numbe
     */
    export function getBackBuildNumber(): string {
        try {
            return backendVersion.split("-")[2];
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    /**
     * XVM.getBuildNumber
     * @return(string) the disaplyed buld number
     */
    export function getBuildNumber(): string {
        const frontBuildNumber: string = XVM.getFrontBuildNumber();
        return (frontBuildNumber === "git") ? XVM.getBackBuildNumber() : frontBuildNumber;
    }

    /**
     * Get Patch Version
     */
    export function getPatchVersion(): string {
        return (typeof gPatchVersion == 'undefined' || gPatchVersion == null)
        ? "" : "P" + gPatchVersion;
    }

    /**
     *  XVM.getMaxUsers
     */
    export function getMaxUsers(): number {
        return numUsers;
    }

    /**
     * XVM.getMaxNodes
     */
    export function getMaxNodes(): number {
        return numNodes;
    }

    /**
     * XVM.isCloud
     */
    export function isCloud(): boolean {
        if (_cloud === undefined) {
            _cloud = (typeof gCloud !== "undefined" && gCloud === true) || false;
        }
        return _cloud;
    }

    /**
     * XVM.isDataMart
     */
    export function isDataMart(): boolean {
        return (typeof gDataMart !== "undefined" && gDataMart === true);
    }

    /**
     * XVM.isSingleUser
     */
    export function isSingleUser(): boolean {
        return XVM.isCloud() || XVM.isDataMart();
    }

    /**
     * XVM.checkMaxUsers
     * @param userInfos
     * @returns true if it need to warn
     */
    export function checkMaxUsers(userInfos: object): boolean {
        if (userInfos == null) {
            console.error("wrong args, cannot check");
            return false;
        }

        if (XVM.isSingleUser()) {
            // cloud deployment skip the check
            return false;
        } else if (Admin.isAdmin()) {
            // admin skip the check
            return false;
        } else if (typeof numUsers !== "number" || numUsers <= 0) {
            console.error("license not set up correctly!");
            return false;
        }

        const curNumUsers: number = Object.keys(userInfos).length;
        if (curNumUsers >= (numUsers * 2)) {
            Alert.error(AlertTStr.UserOverLimit, AlertTStr.UserOverLimitMsg, {
                "lockScreen": true
            });
            return true;
        } else if (curNumUsers >= numUsers) {
            console.warn("concurrent users is more than max users in license");
            return true;
        }
        return false;
    }

    /**
     * XVM.checkVersion
     * @param connectionCheck
     * @returns Promise<boolean>
     */
    export function checkVersion(connectionCheck: boolean): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        XcalarGetVersion(connectionCheck)
            .then((result: Xcrpc.Version.VersionOutput) => {
                let versionMatch: boolean = true;
                try {
                    backendVersion = result.version;
                    const versionNum: number = result.thriftVersionSignatureShort;
                    if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                        versionMatch = false;
                        console.log("Thrift version mismatch!",
                            "Backend's thrift version is:", versionNum);
                        console.log("Frontend's thrift version is:",
                            XcalarApiVersionT.XcalarApiVersionSignature);
                        console.log("Frontend's git SHA is:", gGitVersion);
                    }
                    const versionNumXcrpc = result.xcrpcVersionSignatureShort;
                    if (versionNumXcrpc !== Xcrpc.EnumMap.XcRpcApiVersionToInt.ProtoAPIVersionSignature) {
                        versionMatch = false;
                        console.log("Xcrpc version mismatch!",
                            "Backend's xcrpc version is:", versionNumXcrpc);
                        console.log("Frontend's xcrpc version is:",
                            Xcrpc.EnumMap.XcRpcApiVersionToInt.ProtoAPIVersionSignature);
                        console.log("Frontend's git SHA is:", gGitVersion);
                    }
                } catch (error) {
                    // code may go here if thrift changes
                    versionMatch = false;
                    console.error(error);
                }
                deferred.resolve(versionMatch);
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XVM.compareVersions
     * Compare versions up to last mutually present sequence part
     * @param v1str
     * @returns string
     */
    export function compareVersions(v1str: string, v2str: string): string {
        const v1 = parseVersionString(v1str);
        const v2 = parseVersionString(v2str);
        const sharedLength = Math.min(v1.length, v2.length);
        if (sharedLength === 0) {
            return VersionComparison.Invalid;
        }
        for (let i = 0; i < sharedLength; i++) {
            if (v1[i] !== v2[i]) {
                return v1[i] < v2[i] ? VersionComparison.Smaller : VersionComparison.Bigger;
            }
        }
        return VersionComparison.Equal;
    }

    /**
     * XVM.compareToCurrentVersion
     * Compare versions up to last mutually present sequence part
     * @param v1str
     * @returns string
     */
    export function compareToCurrentVersion(v1str: string): string {
        return XVM.compareVersions(v1str, XVM.getVersion());
    }

    /**
     * XVM.checkVersionAndLicense
     */
    export function checkVersionAndLicense(): XDPromise<any> {
        let passed: boolean = true;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        XVM.checkVersion(false)
            .then((versionMatch) => {
                let err: object;
                try {
                    if (!versionMatch) {
                        err = { error: ThriftTStr.Update };
                        passed = false;
                    }
                } catch (error) {
                    // code may go here if thrift changes
                    console.error(error);
                    err = { error: ThriftTStr.Update };
                    passed = false;
                }

                if (passed) {
                    return XcalarGetLicense();
                } else {
                    deferred.reject(err);
                }
            }, function (ret) {
                ret = ret || {};
                passed = false;
                if (ret.status === StatusT.StatusSessionUsrAlreadyExists ||
                    ret.status === StatusT.StatusClusterNotReady
                ) {
                    deferred.reject(ret);
                } else {
                    deferred.reject({ error: ThriftTStr.CCNBE });
                }
            })
            .then(function (license: Xcrpc.License.LicenseInfo) {
                if (!passed) {
                    return;
                }
                const error = parseLicense(license);
                if (error == null) {
                    deferred.resolve();
                } else {
                    showInvalidLicenseAlert(error);
                    deferred.resolve();
                }
            }, function (err) {
                if (!passed) {
                    return;
                }
                licenseExpireInfo = "Unlicensed";
                licenseMode = XcalarMode.Unlic;
                const error: string = (err && typeof err === 'object') ?
                    err.error : ErrTStr.Unknown;
                showInvalidLicenseAlert(error);
                deferred.resolve();
            });

        return deferred.promise();
    }

    /**
     * XVM.checkBuildNumber
     */
    export function checkBuildNumber(): boolean {
        const frontBuildNumber: string = XVM.getFrontBuildNumber();
        if (frontBuildNumber === "git") {
            // dev build, not handle it
            return true;
        } else if (frontBuildNumber === XVM.getBackBuildNumber()) {
            // when build number match
            return true;
        }

        // when build number not match, most likely it's XD has old cache
        // we'll check and hard reload the page
        try {
            const key = "buildNumCheck";
            // if it's null, will be 0
            const buildNumCheckTime = Number(xcLocalStorage.getItem(key));
            const currentTime = new Date().getTime();
            if (currentTime - buildNumCheckTime > 60000) {
                // if last check time is more than 1 minute
                xcLocalStorage.setItem(key, String(currentTime));
                xcManager.reload(true);
            }
            return false;
        } catch (e) {
            console.error(e);
            return true;
        }
    }

    /**
     * XVM.checkKVVersion
     * check KVStore's version to see if need upgrade
     */
    export function checkKVVersion(): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        let firstUser: boolean = false;

        kvVersionStore.get()
            .then(function (res) {
                let versionInfo: KVVersionDurable = parseKVStoreVersionInfo(res);
                checkVersionInfo(versionInfo);
                if (versionInfo == null) {
                    // when it's a first time set up
                    firstUser = true;
                    return firstUserCheck();
                }

                const version: number = versionInfo.version;
                let needUpgrade: boolean = false;
                if (isNaN(version) || version > Durable.Version) {
                    xcConsole.error('Error of KVVersion', res);
                } else if (version < Durable.Version) {
                    needUpgrade = true;
                }

                if (needUpgrade) {
                    const upgrader = new Upgrader(version);
                    return upgrader.exec();
                }
            })
            .then(function () {
                deferred.resolve(firstUser);
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XVM.rmKVVersion
     * XXX it's not used anywhere, just for testing upgrade
     */
    // export function rmKVVersio(): XDPromise<void> {
    //     return kvVersionStore.delete();
    // }

    // commit kvVersion
    /**
     * XVM.commitKVVersion
     */
    export function commitKVVersion(): XDPromise<void> {
        let versionInfo: string = kvVersion.serialize();
        return kvVersionStore.put(versionInfo, true);
    }

    /**
     * XVM.initializeMode
     */
    export function initializeMode(): XDPromise<void> {
        if (XVM.isDataMart()) {
            _mode = null;
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let kvStore: KVStore = _getModeKVStore();
        kvStore.getAndParse()
        .then((res) => {
            res = res || {};
            // default mode when res is null (upgrade case)
            _mode = res.mode || XVM.Mode.Advanced;
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            _mode = XVM.Mode.SQL; // default mode in error case
            deferred.resolve(); // still resolve
        });

        return deferred.promise();
    }

    /**
     * XVM.setMode
     * @param mode
     */
    export function setMode(
        mode: XVM.Mode,
        ignoreSQLChange?: boolean
    ): XDPromise<void> {
        if (XVM.isDataMart()) {
            // data mart don't have the concep of mode
            return PromiseHelper.resolve();
        }
        if (mode === _mode) {
            return PromiseHelper.resolve();
        }
        if (mode === XVM.Mode.SQL && !ignoreSQLChange &&
            SQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    XVM.setMode(mode, true);
                }
            });
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        _mode = mode;

        _commitMode(mode);
        xcManager.setModeStatus();
        TblSourcePreview.Instance.switchMode();
        DSConfig.switchMode();
        let allPanelsClosed = MainMenu.switchMode();
        if (allPanelsClosed) {
            MainMenu.openDefaultPanel();
        }
        PromiseHelper.alwaysResolve(TooltipWalkthroughs.checkFirstTimeTooltip())
        .then(() => {
            deferred.resolve();
        });
        return deferred.promise();
    }

    /**
     * XVM.getMode
     */
    export function getMode(): XVM.Mode {
        return _mode;
    }

    /**
     * XVM.commitMode
     * @param mode
     */
    export function commitMode(mode: XVM.Mode): XDPromise<void> {
        return _commitMode(mode);
    }

    /**
     * XVM.isSQLMode
     */
    export function isSQLMode(): boolean {
        return _mode === XVM.Mode.SQL;
    }

    /**
     * XVM.isAdvancedMode
     */
    export function isAdvancedMode(): boolean {
        return !XVM.isSQLMode();
    }

    function _getModeKVStore(): KVStore {
        const key: string = KVStore.getKey("gModeKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    function _commitMode(mode: XVM.Mode): XDPromise<void> {
        const kvStore = _getModeKVStore();
        let data = {
            mode: mode
        };
        return kvStore.put(JSON.stringify(data), true, true);
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        XVM["__testOnly__"] = {
            showInvalidLicenseAlert: showInvalidLicenseAlert,
            parseLicense: parseLicense,
            parseKVStoreVersionInfo: parseKVStoreVersionInfo,
        }
    }
    /* End Of Unit Test Only */
}
