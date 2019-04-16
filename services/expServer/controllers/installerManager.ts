import { Status } from "../utils/supportStatusFile";
import { exec, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as stream from "stream";
import * as zlib from "zlib";
import * as crypto from "crypto";
import * as support from "../utils/expServerSupport";
import * as xcConsole from "../utils/expServerXcConsole";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;

const installStatus = {
    "Error": -1,
    "Done": 2,
    "Running": 1
};
let curStep: any = {};
let errorLog: string = "";
let scriptRoot: string = process.env.XCE_INSTALLER_ROOT;
if (!scriptRoot) {
    scriptRoot = "";
}
let cliArguments: string  = "";
let hostnameLocation: string = path.join(scriptRoot, "/config/hosts.txt");
let privHostnameLocation: string = path.join(scriptRoot, "/config/privHosts.txt");
let ldapLocation: string = path.join(scriptRoot, "/config/ldapConfig.json");
let discoveryResultLocation: string = path.join(scriptRoot, "/tmp/config.json");
let licenseLocation: string = path.join(scriptRoot, "/config/license.txt");
let credentialLocation: string = path.join(scriptRoot, "/tmp/key.txt");

const scriptDir: string = path.join(scriptRoot, "/installer");
const getNodeRegex: RegExp = /\[([0-9]+)\]/;
const getStatusRegex: RegExp = /\[([A-Z]+)\]/;

interface ReturnMsg {
    status: number,
    curStepStatus?: number,
    verified?: boolean,
    data?: any,
    retVal?: string[],
    reason?: string,
    errorLog?: string, // the error message by script running
    installationLogs?: any // all installation logs
}

interface Credentials {
    password?: string,
    sshKey?: string,
    sshUserSettings?: string
}

interface NFSOption {
    option: string,
    nfsServer?: string,
    nfsMountPoint?: string,
    nfsUsername?: string,
    nfsGroup?: string,
    nfsReuse?: string,
    copy?: boolean
}

interface LDAPOption {
    deployOption: string,
    domainName?: string,
    companyName?: string,
    password?: string
}

interface AdminConfig {
    defaultAdminEnabled: boolean,
    username?: string,
    email?: string,
    password?: string
}

interface CredArray {
    credentials: Credentials,
    username: string,
    port: string,
    nfsOption: NFSOption,
    installationDirectory: string,
    ldap: LDAPOption,
    defaultAdminConfig: AdminConfig,
    serializationDirectory: string,
    preConfig: boolean,
    supportBundles: boolean,
    enableHotPatches: boolean,
    hostnames?: string[],
    privHostNames?: string[],
    licenseKey?: string
}

interface InstallerInput {
    hasPrivHosts: boolean,
    credArray: CredArray
}

export function initStepArray(): void {
    curStep = {
        "stepString": "Step [0] Starting...",
        "nodesCompletedCurrent": [],
        "status": Status.Running,
    };
}

export function clearErrorLog(): void {
    errorLog = "";
}

export function genExecString(input: InstallerInput): string {
    let hasPrivHosts: boolean = input.hasPrivHosts;
    let credentialsOption: Credentials = input.credArray.credentials;
    let username: string = input.credArray.username;
    let port: string = input.credArray.port;
    let nfsOption: NFSOption = input.credArray.nfsOption;
    let installationDirectory: string = input.credArray.installationDirectory;
    let ldapOption: LDAPOption = input.credArray.ldap;
    let defaultAdminOption: AdminConfig = input.credArray.defaultAdminConfig;
    let serDes: string = input.credArray.serializationDirectory;
    let preConfig: boolean = input.credArray.preConfig;
    let supportBundles: boolean = input.credArray.supportBundles;
    let enableHotPatches: boolean = input.credArray.enableHotPatches;

    let execString: string = " -h " + hostnameLocation;
    execString += " -l " + username;
    if (hasPrivHosts) {
        execString += " --priv-hosts-file " + privHostnameLocation;
    }
    if ("password" in credentialsOption) {
        execString += " --ssh-mode password";
        execString += " --password-file " + credentialLocation;
    } else if ("sshKey" in credentialsOption) {
        execString += " --ssh-mode key";
        execString += " -i " + credentialLocation;
    } else if ("sshUserSettings" in credentialsOption) {
        execString += " --ssh-mode user";
    }
    execString += " -p " + port;
    execString += " --license-file " + licenseLocation;
    // execString += " --installer " + installerLocation;

    if (nfsOption) {
        // Xcalar to mount NFS
        if (nfsOption.option === "customerNfs") {
            execString += " --nfs-mode external";
            execString += " --nfs-host " + nfsOption.nfsServer;
            execString += " --nfs-folder " + nfsOption.nfsMountPoint;
            if (nfsOption.nfsUsername) {
                execString += " --nfs-uid " + nfsOption.nfsUsername;
            }
            if (nfsOption.nfsGroup) {
                execString += " --nfs-gid " + nfsOption.nfsGroup;
            }
        } else if (nfsOption.option === "readyNfs") {
            // Xcalar Root Already mounted
            execString += " --nfs-mode reuse";
            execString += " --nfs-reuse " + nfsOption.nfsReuse;
        } else if (nfsOption.option === "xcalarNfs") {
            execString += " --nfs-mode create";
        }

        if (nfsOption.copy) {
            execString += " --nfs-copy";
        }
    }
    if (ldapOption) {
        if (ldapOption.deployOption === "xcalarLdap") {
            execString += " --ldap-mode create";
            execString += " --ldap-domain " + ldapOption.domainName;
            execString += " --ldap-org " + '"' + ldapOption.companyName + '"';
            execString += " --ldap-password " + '"' + encryptPassword(ldapOption.password) + '"';
        } else if (ldapOption.deployOption === "customerLdap") {
            execString += " --ldap-mode external";
        }
    }
    if (defaultAdminOption) {
        if (defaultAdminOption.defaultAdminEnabled) {
            execString += " --default-admin";
            execString += " --admin-username " + '"' + defaultAdminOption.username + '"';
            execString += " --admin-email " + '"' + defaultAdminOption.email + '"';
            execString += " --admin-password " + '"' + defaultAdminOption.password + '"';
        }
    }
    if (serDes) {
        execString += " --serdes " + '"' + serDes + '"';
    }
    if (!preConfig) {
        execString += " --pre-config";
    }
    if (installationDirectory) {
        execString += " --install-dir " + installationDirectory;
    }
    if (supportBundles) {
        execString += " --support-bundles";
    }
    if (enableHotPatches) {
        execString += " --enable-hotPatches";
    }

    return execString;
}

export function genDiscoverExecString(hostnameLocation: string,
                               credentialLocation: string,
                               isPassword: boolean,
                               username: string,
                               port: string,
                               installationDirectory: string): string {
    let execString: string = " -h " + hostnameLocation;
    execString += " -l " + username;
    if (isPassword) {
        execString += " --password-file ";
    } else {
        execString += " -i ";
    }
    execString += credentialLocation;
    execString += " -p " + port;
    execString += " --install-dir " + installationDirectory;

    return execString;
}

export function encryptPassword(password: string): string {
    let shasum: crypto.Hash = crypto.createHash('sha1');

    let salt: Buffer = crypto.randomBytes(4);
    let encryptedPassword: string = "";

    shasum.update(password);
    shasum.update(salt);

    let bufSalt: Buffer = Buffer.from(salt);
    let hexSSHA: Buffer = Buffer.from(shasum.digest('hex') + bufSalt.toString('hex'),
                                  'hex');

    encryptedPassword = '{SSHA}' + hexSSHA.toString('base64');

    return encryptedPassword;
}

export function createStatusArray(credArray: CredArray): Promise<ReturnMsg> {
    let deferred: any = jQuery.Deferred();
    let ackArray: string[] = [];
    // Check global array that has been populated by prev step
    for (let i: number = 0; i < credArray.hostnames.length; i++) {
        if (curStep.nodesCompletedCurrent[i] === true) {
            ackArray.push(curStep.stepString + " (Done)");
        } else if (curStep.nodesCompletedCurrent[i] === false) {
            ackArray.push("FAILED: " + curStep.stepString);
        } else {
            ackArray.push(curStep.stepString + " (Executing)");
        }
    }
    let retMsg: ReturnMsg;
    if (curStep.curStepStatus === installStatus.Error) {
        support.slaveExecuteAction("GET", "/installationLogs/slave",
                                    {isHTTP: "true"})
        .always(function(message) {
            retMsg = {
                "status": httpStatus.OK,
                "curStepStatus": curStep.curStepStatus,
                "retVal": ackArray,
                "errorLog": errorLog, // the error message by script running
                "installationLogs": message.logs // all installation logs
            };
            deferred.reject(retMsg);
        });
    } else {
        retMsg = {
            "status": httpStatus.OK,
            "curStepStatus": curStep.curStepStatus,
            "retVal": ackArray
        };
        deferred.resolve(retMsg);
    }
    xcConsole.log("Success: send status array");
    return deferred.promise();
}

export function stdOutCallback(dataBlock: string): void {
    let lines: string[] = dataBlock.split("\n");
    for (let i = 0; i<lines.length; i++) {
        let data: string = lines[i];
        xcConsole.log("Start ==" + data + "==");
        if (data.indexOf("Step [") === 0 || data.indexOf("STEP [") === 0) {
            // New Step! Means all the old ones are done
            curStep.stepString = data;
            curStep.nodesCompletedCurrent = [];
        } else if (data.indexOf("[") === 0) {
            // One node completed current step!
            let hostId: string = (getNodeRegex.exec(data))[1];
            let status: string = (getStatusRegex.exec(data))[1];
            if (status === "SUCCESS") {
                curStep.nodesCompletedCurrent[hostId] = true;
            } else {
                curStep.nodesCompletedCurrent[hostId] = false;
                // XXX error message?
            }
        }
    }
}

export function stdErrCallback(dataBlock: string): void {
    errorLog += dataBlock + "\n";
}

export function checkLicense(credArray: any, script?: string): Promise<ReturnMsg> {
    let deferredOut: any = jQuery.Deferred();
    let fileLocation: string = licenseLocation;
    let compressedLicense: Buffer = Buffer.from(credArray.licenseKey, 'base64');
    let licenseStream: stream.PassThrough = new stream.PassThrough();

    licenseStream.write(compressedLicense);
    licenseStream.end();

    let zlibStream: zlib.Gunzip = zlib.createGunzip();
    let licenseFileStream: fs.WriteStream = fs.createWriteStream(fileLocation);
    licenseStream.pipe(zlibStream).pipe(licenseFileStream);

    let retMsg: ReturnMsg;
    zlibStream.on('error', function(err) {
        // will hit this when has error format license
        xcConsole.error('zlibStream', err);
        retMsg = {"status": httpStatus.InternalServerError};
        if (err) {
            deferredOut.reject(retMsg);
            return;
        }
    });

    licenseFileStream.on('error', function(err) {
        xcConsole.error('licenseFileStream', err);
        retMsg = {"status": httpStatus.InternalServerError};
        if (err) {
            deferredOut.reject(retMsg);
            return;
        }
    });

    licenseFileStream.on('close', function(data) {
        let out: ChildProcess;
        if (script) {
            out = exec(script);
        } else {
            out = exec(scriptDir + '/01-* --license-file ' + fileLocation);
        }
        out.stdout.on('data', function(data) {
            if (data.indexOf("SUCCESS") > -1) {
                retMsg = {"status": httpStatus.OK, "verified": true};
                xcConsole.log("Success: Check License");
                // deferredOut.resolve(retMsg);
            } else if (data.indexOf("FAILURE") > -1) {
                retMsg = {"status": httpStatus.OK, "verified": false};
                xcConsole.log("Failure: Check License");
                // deferredOut.reject(retMsg);
            }
        });
        out.stdout.on('close', function(data) {
            if (retMsg && retMsg.hasOwnProperty("verified") && retMsg.verified) {
                // Only resolve when verified is true
                retMsg['data'] = {};
                let licenseDataStr: string = fs.readFileSync(fileLocation).toString();
                licenseDataStr.split('\n').forEach(function(line) {
                    let arr: string[] = line.split('=');
                    if (arr[0] !== '') {
                        retMsg.data[arr[0]] = arr[1];
                    }
                });

                deferredOut.resolve(retMsg);
            } else {
                // This can be: 1. verified is false.
                // 2. For test case when data does not contain SUCCESS or FAILURE
                retMsg = retMsg || {"status": httpStatus.InternalServerError};
                deferredOut.reject(retMsg);
            }
        });
    });

    return deferredOut.promise();
}

export function copyFiles(script: string): Promise<ReturnMsg> {
    let deferredOut: any = jQuery.Deferred();
    let execString = scriptDir + "/deploy-shared-config.sh ";
    execString += cliArguments;
    xcConsole.log(execString);
    let out: ChildProcess;
    if (script) {
        out = exec(script);
    } else {
        out = exec(execString);
    }
    out.stdout.on('data', function(data) {
        xcConsole.log(data);
    });
    let errorMessage: string = "ERROR: ";
    out.stderr.on('data', function(data) {
        errorMessage += data;
        xcConsole.error("Copy File ERROR: " + data);
    });
    out.on('close', function(code) {
        let retMsg: ReturnMsg;
        if (code) {
            xcConsole.error("Failure: Copy files.");
            retMsg = {
                "status": httpStatus.InternalServerError,
                "reason": errorMessage
            };
            deferredOut.reject(retMsg);
        } else {
            retMsg = {"status": httpStatus.OK};
            deferredOut.resolve(retMsg);
        }
    });
    return deferredOut.promise();
}

export function installUpgradeUtil(credArray: CredArray, execCommand: string,
    script?: string): Promise<any> {
    // Write files to /config and chmod
    let deferredOut: any = jQuery.Deferred();
    let hostArray: string[] = credArray.hostnames;
    let hasPrivHosts = false;
    clearErrorLog();

    function initialStep(): Promise<any> {
        let deferred: any = jQuery.Deferred();
        if ("password" in credArray.credentials) {
            let password: string = credArray.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('600', 8)},
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             deferred.resolve();
                         });
        } else if ("sshKey" in credArray.credentials) {
            let sshkey: string = credArray.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('600', 8)},
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             deferred.resolve();
                         });
        } else {  // when it contains sshUserSettings
            deferred.resolve();
        }
        return deferred.promise();
    }

    initialStep()
    .then(function() {
        let deferred: any = jQuery.Deferred();
        fs.writeFile(hostnameLocation, hostArray.join("\n"), function(err) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
        return deferred.promise();
    })
    .then(function() {
        let deferred: any = jQuery.Deferred();
        if (credArray.privHostNames.length > 0) {
            fs.writeFile(privHostnameLocation,
                         credArray.privHostNames.join("\n"),
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             hasPrivHosts = true;
                             deferred.resolve();
                         });
        } else {
            fs.writeFile(privHostnameLocation, credArray.hostnames.join("\n"),
                         function(err) {
                             if (err) {
                                 deferred.reject(err);
                                 return;
                             }
                             hasPrivHosts = true;
                             deferred.resolve();
                         });
        }
        return deferred.promise();
    })
    .then(function() {
        let deferred: any = jQuery.Deferred();
        fs.writeFile(ldapLocation, JSON.stringify(credArray.ldap, null, 4),
                     function(err) {
                         if (err) {
                             deferred.reject(err);
                             return;
                         }
                         deferred.resolve();
                     });
        return deferred.promise();
    })
    .then(function() {
        let deferred: any = jQuery.Deferred();
        let execString: string = scriptDir + "/" + execCommand;
        cliArguments = genExecString({
            "hasPrivHosts": hasPrivHosts,
            "credArray": credArray
        });

        execString += cliArguments;
        initStepArray();
        let out: ChildProcess;
        if (script) {
            out = exec(script);
        } else {
            out = exec(execString);
        }

        out.stdout.on('data', stdOutCallback);
        out.stderr.on('data', stdErrCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                xcConsole.log("Failure: Executing " + execString +
                  " fails. " + errorLog);
                curStep.curStepStatus = installStatus.Error;
                deferred.reject();
            } else {
                curStep.curStepStatus = installStatus.Done;
                deferred.resolve();
            }
        });
        return deferred.promise();
    })
    .then(function() {
        deferredOut.resolve();
    })
    .fail(function(err) {
        xcConsole.log("Failure: Xcalar installation fails. " + err);
        curStep.curStepStatus = installStatus.Error;
        deferredOut.reject(err);
    });
    return deferredOut.promise();
}

export function discoverUtil(credArray: any, execCommand: string,
    script?: string): Promise<any> {
    // Write files to /config and chmod
    let deferredOut: any = jQuery.Deferred();
    let hostArray: string[] = credArray.hostnames;
    let hasPrivHosts: boolean = false;
    let retMsg: ReturnMsg;
    clearErrorLog();

    function initialStep(): Promise<void> {
        let deferred: any = jQuery.Deferred();
        if ("password" in credArray.credentials) {
            let password: string = credArray.credentials.password;
            fs.writeFile(credentialLocation, password,
                         {mode: parseInt('600', 8)},
                         function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                         });
        } else if ("sshKey" in credArray.credentials) {
            let sshkey: string = credArray.credentials.sshKey;
            fs.writeFile(credentialLocation, sshkey,
                         {mode: parseInt('600', 8)},
                         function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                         });
        } else {  // when it contains sshUserSettings
            deferred.resolve();
        }
        return deferred.promise();
    }

    initialStep()
    .then(function() {
        let deferred: any = jQuery.Deferred();
        fs.writeFile(hostnameLocation, hostArray.join("\n"), function(err) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve();
        });
        return deferred.promise();
    })
    .then(function() {
        let deferred: any = jQuery.Deferred();
        let execString: string = scriptDir + "/" + execCommand;
        cliArguments = genExecString({
            "hasPrivHosts": hasPrivHosts,
            "credArray": credArray
        });
        execString += cliArguments;
        initStepArray();
        let out: ChildProcess;
        if (script) {
            out = exec(script);
        } else {
            out = exec(execString);
        }

        out.stdout.on('data', stdOutCallback);
        out.stderr.on('data', stdErrCallback);

        out.on('close', function(code) {
            // Exit code. When we fail, we return non 0
            if (code) {
                xcConsole.log("Failure: Executing " + execString +
                              " fails. " + errorLog);
                deferred.reject(code);
            } else {
                fs.readFile(discoveryResultLocation, "utf8", function(err, data) {
                    if (err) deferred.reject(err);
                    let discoveryResult: any = JSON.parse(data.replace(/\n$/, ''));
                    deferred.resolve(discoveryResult);
                });
            }
        });
        return deferred.promise();
    })
    .fail(function(err) {
        xcConsole.log("Failure: Xcalar discovery failed with return code: " + err);
        support.slaveExecuteAction("GET", "/installationLogs/slave",
            {isHTTP: "true"})
        .always(function(message) {
            retMsg = {
                "status": httpStatus.InternalServerError,
                "errorLog": errorLog, // the error message by script running
                "installationLogs": message.logs // all installation logs
            };
            deferredOut.reject(retMsg);
        });
    })
    .done(function(discoveryResult) {
        xcConsole.log("Success: Xcalar discovery succeeded.");
        deferredOut.resolve(discoveryResult);
    });

    return deferredOut.promise();
}

export function installXcalar(credArray: CredArray): void {
    installUpgradeUtil(credArray, "cluster-install.sh");
}

export function upgradeXcalar(credArray: CredArray): void {
    installUpgradeUtil(credArray, "cluster-upgrade.sh");
}

export function uninstallXcalar(credArray: CredArray): void {
    installUpgradeUtil(credArray, "cluster-uninstall.sh");
}

export function discoverXcalar(credArray: CredArray): Promise<any> {
    return discoverUtil(credArray, "cluster-discover.sh");
}

// Below part is only for Unit Test
export function getCurStepStatus() {
    return curStep.curStepStatus;
}
export function setTestVariables(opts) {
    if (opts.hostnameLocation) {
        hostnameLocation = opts.hostnameLocation;
    }
    if (opts.privHostnameLocation) {
        privHostnameLocation = opts.privHostnameLocation;
    }
    if (opts.ldapLocation) {
        ldapLocation = opts.ldapLocation;
    }
    if (opts.discoveryResultLocation) {
        discoveryResultLocation = opts.discoveryResultLocation;
    }
    if (opts.licenseLocation) {
        licenseLocation = opts.licenseLocation;
    }
    if (opts.credentialLocation) {
        credentialLocation = opts.credentialLocation;
    }
}
export function fakeCheckLicense(func) {
    checkLicense = func;
}
export function fakeInstallUpgradeUtil(func) {
    installUpgradeUtil = func;
}
export function fakeDiscoverUtil(func) {
    discoverUtil = func;
}
export function fakeCreateStatusArray(func) {
    createStatusArray = func;
}