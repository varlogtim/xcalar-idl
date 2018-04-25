// XVM = Xcalar Version Manager
namespace XVM {
    const majorVersion: string = '1';
    const minorVersion: string = '3';
    const revisionVersion: string = '1';

    // build number is generated during the build process by Makefile and jenkins
    if (typeof gBuildNumber === 'undefined') {
        gBuildNumber = 'git';
    }
    const fullVersion: string = `${majorVersion}.${minorVersion}.${revisionVersion}-${gBuildNumber}`;

    let kvVersion: KVVersion;
    let kvVersionStore: KVStore;
    let backendVersion: string = '';
    let licensee: string = '';
    let licenseExpireInfo: string = '';
    let licenseMode: XcalarMode = null;
    // let expirationDate: Date = null;
    let numUsers: number = -1; // Set, but not used
    let numNodes: number = -1; // Set, but not used

    /* ==================== Helper Function ================================= */
    function showInvalidLicenseAlert(error: string): void {
        Alert.show({
            title: AlertTStr.LicenseErr,
            isAlert: true,
            msg: error + '\n' + AlertTStr.LicenseErrMsg
        });
    }

    function parseLicense(license: any): string | null {
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
                licenseMode = XcalarMode.Mod;

                if (license.product === "XceMod") {
                    licenseMode = XcalarMode.Mod;
                } else if (license.product === "XceOper") {
                    licenseMode = XcalarMode.Oper;
                } else if (license.product === "Xce") {
                    licenseMode = XcalarMode.Oper;
                } else {
                    console.error("Illegal op mode");
                    licenseMode = XcalarMode.Mod;
                }
            }
            numNodes = license.nodeCount;
            numUsers = license.userCount;
            licensee = license.licensee;
            if (license.expired) {
                console.log(license);
                const error: string = xcHelper.replaceMsg(ErrTStr.LicenseExpire, {
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

    function parseKVStoreVersionInfo(info: string): KVVersion {
        if (info == null) {
            return null;
        }

        let versionInfo: KVVersion;
        try {
            versionInfo = JSON.parse(info);
            if (typeof versionInfo !== 'object') {
                // an old version of versionInfo
                versionInfo = {
                    version: Number(versionInfo),
                    stripEmail: true,
                    needCommit: true
                };
            }
        } catch (error) {
            console.error("parse error", error);
            return null;
        }
        return versionInfo;
    }

    function checkVersionInfo(versionInfo) {
        kvVersion = new KVVersion(versionInfo);
        if (kvVersion.stripEmail) {
            // need to redo the username setup
            XcSupport.setup(true);
        }
    }

    function firstUserCheck(): XDPromise<void> {
        const isFreeTrail: boolean = false;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promise: XDPromise<void> = isFreeTrail ?
            EULAModal.show() : PromiseHelper.resolve();

        promise
            .then(XVM.commitKVVersion)
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }
    /* ==================== End of Helper Function ========================== */

    /**
     * XVM.setup
     */
    export function setup(): void {
        const key: string = "xcalar-version-" + XcSupport.getUser();
        kvVersionStore = new KVStore(key, gKVScope.USER);
    }

    /**
     * XVM.getVersion
     */
    export function getVersion(): string {
        return fullVersion;
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
     * XVM.checkMaxUsers
     * @param userInfos
     * @returns true if it need to warn
     */
    export function checkMaxUsers(userInfos: object): boolean {
        if (userInfos == null) {
            console.error("wrong args, cannot check");
            return false;
        }

        if (Admin.isAdmin()) {
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
            .then((result) => {
                let versionMatch: boolean = true;
                try {
                    backendVersion = result.version;
                    const versionNum: number = result.apiVersionSignatureShort;
                    if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                        versionMatch = false;
                        console.log("Thrift version mismatch!",
                            "Backend's thrift version is:", versionNum);
                        console.log("Frontend's thrift version is:",
                            XcalarApiVersionT.XcalarApiVersionSignature);
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
                passed = false;
                if (ret && ret.status === StatusT.StatusSessionUsrAlreadyExists) {
                    deferred.reject(ret);
                } else {
                    deferred.reject({ error: ThriftTStr.CCNBE });
                }
            })
            .then(function (license) {
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
     * XVM.checkKVVersion
     * check KVStore's version to see if need upgrade
     */
    export function checkKVVersion(): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        let firstUser: boolean = false;

        kvVersionStore.get()
            .then(function (res) {
                const versionInfo: KVVersion = parseKVStoreVersionInfo(res);
                checkVersionInfo(versionInfo);
                if (versionInfo == null) {
                    // when it's a first time set up
                    firstUser = true;
                    return firstUserCheck();
                }

                const version: number = versionInfo.version;
                let needUpgrade: boolean = false;
                if (isNaN(version) || version > currentVersion) {
                    xcConsole.error('Error of KVVersion', res);
                } else if (version < currentVersion) {
                    needUpgrade = true;
                }

                if (needUpgrade) {
                    const upgrader = new Upgrader(version);
                    return upgrader.exec();
                } else if (versionInfo.needCommit) {
                    return XVM.commitKVVersion();
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
        const version: string = JSON.stringify(kvVersion);
        return kvVersionStore.put(version, true);
    }

    // XVM.alertLicenseExpire = function() {
    //     // for demo mode only
    //     if (XVM.getLicenseMode() !== XcalarMode.Demo) {
    //         return;
    //     }

    //     var currentTime = new Date().getTime();
    //     var expireTime = expirationDate.getTime();

    //     if (expireTime <= currentTime) {
    //         // this is an error case, should not happen
    //         var msg = xcHelper.replaceMsg(ErrTStr.LicenseExpire, {
    //             "date": licenseKey
    //         });

    //         Alert.show({
    //             "title": DemoTStr.title,
    //             "msg": msg,
    //             "lockScreen": true,
    //             "expired": true
    //         });
    //     } else {
    //         Alert.show({
    //             "title": DemoTStr.title,
    //             "msg": getExpireCountDownMsg(expireTime - currentTime),
    //             "isAlert": true
    //         });
    //     }

    //     function getExpireCountDownMsg(diff) {
    //         var oneMinute = 1000 * 60;
    //         var oneHour = oneMinute * 60;
    //         var oneDay = oneHour * 24;

    //         var dayDiff = Math.floor(diff / oneDay);
    //         diff -= dayDiff * oneDay;
    //         var hourDiff = Math.floor(diff / oneHour);
    //         diff -= hourDiff * oneHour;
    //         var minuteDiff = Math.floor(diff / oneMinute);

    //         var words = [];
    //         words.push(getWord(dayDiff, DemoTStr.day, DemoTStr.days));
    //         words.push(getWord(hourDiff, DemoTStr.hour, DemoTStr.hours));
    //         words.push(getWord(minuteDiff, DemoTStr.minute, DemoTStr.minutes));

    //         return DemoTStr.msg + " " + words.join(", ");
    //     }

    //     function getWord(num, singular, plural) {
    //         if (num <= 1) {
    //             return num + " " + singular;
    //         } else {
    //             return num + " " + plural;
    //         }
    //     }
    // };
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
