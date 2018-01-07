window.InstallerCommon = (function(InstallerCommon, $) {
    /*
    finalStruct
     * {
            "preConfig":false,
            "nfsOption":{
                "option":"xcalarNfs" // either one of "xcalarNfs", "customerNfs", "readyNfs", "doNothing"
                "nfsServer": something     //only for option customerNfs
                "nfsMountPoint": something //only for option customerNfs
                "nfsUsername": something   //only for option customerNfs
                "nfsGroup": something      //only for option customerNfs
                "nfsReuse": something      //only for option readyNfs
                "copy": true or false      //for installer, always false, for upgrader, only true when user choose to copy
            },
            "hostnames":["gui-install-test1"],
            "privHostNames":[],
            "username":"un",
            "port":"22",
            "credentials":{
                // Be either one of the below choice
                "sshKey": "something"
                "password": "something"
                "sshUserSettings":true
            },
            "installationDirectory":"/opt/xcalar/",
            "serializationDirectory":"/SD",
            "ldap":{
                "xcalarInstall": true,
                "domainName":"a",         // only when xcalarInstall is true
                "password":"b",           // only when xcalarInstall is true
                "companyName":"d",        // only when xcalarInstall is true
                "ldap_uri": "e"           // only when xcalarInstall is false
                "userDN": "f",            // only when xcalarInstall is false
                "searchFilter": "g",      // only when xcalarInstall is false
                "serverKeyFile": "h",     // only when xcalarInstall is false
                "activeDir": "i",         // only when xcalarInstall is false
                "useTLS": "j",            // only when xcalarInstall is false
                "ldapConfigEnabled": "k", // only when xcalarInstall is false
                "adUserGroup": "l",       // only when xcalarInstall is false and activeDir is true
                "adAdminGroup: "m",       // only when xcalarInstall is false and activeDir is true
                "adDomain": "n",          // only when xcalarInstall is false and activeDir is true
                "adSubGroupTree": "o"     // only when xcalarInstall is false and activeDir is true
            }
        }

    discoverResult
        {"discoverResult": {"hosts": ['fake host 1'],
                            "privHosts": ['fake priv host 1'],
                            "ldapConfig": {
                                            "activeDir": false,
                                            "searchFilter": "(memberof=cn=xceUsers,ou=Groups,dc=xcalar,dc=com)",
                                            "userDN": "mail=%username%,ou=People,dc=xcalar,dc=com",
                                            "useTLS": true,
                                            "serverKeyFile": "/opt/ca/ldap.cert",
                                            "ldap_uri": "ldap://127.0.0.1:389",
                                            "xcalarInstall": false
                                          }
                            "license": "AAAAAABAD92819321820BCAD...",
                            'xcalarMount': {'option': 'readyNfs', 'server': '123', 'path': 'xmount 1'},
                            'xcalarRoot': '/mnt/xcalar',
                            'xcalarSerDes': '/serdes'
                           }
        }
     */

    var finalStruct = {
        "preConfig": false,
        "nfsOption": {},
        "hostnames": [],
        "privHostNames": [],
        "username": "",
        "port": 22,
        "credentials": {},
        "installationDirectory": null,
        "serializationDirectory": null,
        "ldap": {}
    };
    var installStatus = {
        "Error": -1,
        "Running": 1,
        "Done": 2
    };
    var discoverResult = {};
    var licenseCheckingApi = "/xdp/license/verification";
    var discoverApi = "/xdp/discover";
    var cancel = false;
    var done = false;

    InstallerCommon.setupForms = function($forms, validateStep, formClass) {
        $forms.find(".buttonSection").on("click", "input.next", function() {
            var $form = $(this).closest("form");
            var curStep = findStepId($form, $forms);
            if (curStep === 0 && (!$("#formArea").hasClass(formClass))) {
                return;
            }
            validateStep(curStep, $form)
            .then(function(returnStructure) {
                if (returnStructure) {
                    jQuery.extend(finalStruct, returnStructure);
                }
                showStep(curStep + 1, $forms);
            })
            .fail(function() {
                showFailure($form[0], arguments);
            });
            return false;
        });

        $forms.find(".buttonSection").on("click", "input.back", function() {
            var $form = $(this).closest("form");
            var curStep = findStepId($form, $forms);
            showStep(curStep - 1, $forms);
            return false;
        });

        $forms.find(".buttonSection").on("click", "input.clear", function() {
            var $form = $(this).closest("form");
            clearForm($form, true);
            return false;
        });

        $forms.find("input.cancel").click(function() {
            cancel = true;
            $(this).val("CANCELLING...");
            $(this).addClass("inactive");
        });

        // Set up listeners for radioButtons
        $forms.find(".radioButton").click(function() {
            // If option is the same as before, ignore and return
            if ($(this).hasClass("active")||(!$(this).is(":visible"))) {
                return false;
            }
            var $radioButtonGroup = $(this).closest(".radioButtonGroup");
            var $activeRadio = $(this);
            var $form = $(this).closest("form");
            radioAction($radioButtonGroup, $activeRadio, $form);
            return false;
        });

        ErrorMessage.setup();
    };

    InstallerCommon.validateKey = function($form) {
        var deferred = jQuery.Deferred();
        var finalKey = $form.find(".licenseKey").val();
        if ($form.find(".checkbox:visible").length > 0) {
            var upgradeLicense = $form.find(".checkbox:visible").hasClass("checked");
            if (!upgradeLicense) {
                deferred.resolve();
                return (deferred.promise());
            }
        }

        if (!/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{173}[a-z=]{8}/.test(finalKey)) {
            deferred.reject("Invalid license key", "The license key that " +
                            "you have entered is not valid. Please check " +
                            "the key and try again");
            return (deferred.promise());
        }

        checkLicense(finalKey)
        .then(function(hints, ret) {
            if (ret.verified) {
                deferred.resolve();
            } else {
                deferred.reject("Invalid server license key", "The license key that " +
                                "you have entered is not valid. Please check " +
                                "the key and try again");
            }
        })
        .fail(function() {
            deferred.reject("Connection Error", "Connection with the " +
                            "authentication server cannot be established.");
        });
        return (deferred.promise());

        function checkLicense(license) {
            return sendViaHttps("POST", licenseCheckingApi,
                                JSON.stringify({"licenseKey": license}));
        }
    };

    InstallerCommon.validatePreConfig = function($form) {
        var deferred = jQuery.Deferred();
        var preConfigOption = $form.find(".radioButton.active").data("option");
        var res = {};
        res.preConfig = false;
        switch (preConfigOption) {
            case ("yes"):
                res.preConfig = true;
                deferred.resolve(res);
                break;
            case ("no"):
                res.preConfig = false;
                deferred.resolve(res);
                break;
            default:
                deferred.reject("Invalid Choice", "Please choose one Item");
        }
        return deferred.promise();
    };

    InstallerCommon.validateNfs = function($form) {
        var deferred = jQuery.Deferred();
        var res = {};
        res.nfsOption = {};
        if ($form.find(".checkbox").length > 0 && $form.find(".checkbox.checked").length === 0) {
            res.nfsOption.option = "readyNfs";
            res.nfsOption.nfsReuse = discoverResult.xcalarRoot;
            deferred.resolve(res);
        } else {
            var copyOption = false;
            if ($form.find(".copyChoice .radioButton.active").length > 0) {
                copyOption = $form.find(".copyChoice .radioButton.active").data("option") === "xcalarCopy";
            }
            res.nfsOption.copy = copyOption;
            var nfsOption = $form.find(".nfsChoice .radioButton.active").data("option");
            switch (nfsOption) {
                case ("xcalarNfs"):
                    res.nfsOption.option = "xcalarNfs";
                    deferred.resolve(res);
                    break;
                case ("customerNfs"):
                    if ($form.find(".nfsServer").val().trim().length === 0) {
                        deferred.reject("NFS Server Invalid",
                            "You must provide a valid NFS Server IP or FQDN");
                    } else if ($form.find(".nfsMountPoint").val().trim().length === 0) {
                        deferred.reject("NFS MountPoint Invalid",
                            "You must provide a valid NFS Mount Point");
                    } else {
                        res.nfsOption.option = "customerNfs";
                        res.nfsOption.nfsServer = getVal($form.find(".nfsServer"));
                        res.nfsOption.nfsMountPoint = removeDuplicateSlash(getVal($form.find("input.nfsMountPoint")));
                        res.nfsOption.nfsUsername = getVal($form.find(".nfsUserName"));
                        res.nfsOption.nfsGroup = getVal($form.find(".nfsUserGroup"));
                        deferred.resolve(res);
                    }
                    break;
                case ("readyNfs"):
                    if (getVal($form.find(".nfsMountPointReady")).length === 0) {
                        deferred.reject("NFS Mount Path Invalid",
                            "You must provide a valid NFS Mount Path");
                    } else {
                        res.nfsOption.option = "readyNfs";
                        res.nfsOption.nfsReuse = removeDuplicateSlash(getVal($form.find(".nfsMountPointReady")));
                        deferred.resolve(res);
                    }
                    break;
                default:
                    deferred.reject("Invalid Choice", "Please choose one Item");
            }
        }
        return deferred.promise();
    };

    InstallerCommon.validateHosts = function($form, withoutPrivHost) {
        var deferred = jQuery.Deferred();
        var res = {};
        var hostArray = $form.find(".row .hostname .publicName input");
        var hostPrivateArray = $form.find(".row .hostname .privateName input");
        var allHosts = [];
        var allPrivHosts = [];
        for (var i = 0; i < hostArray.length; i++) {
            var nameOrIP = getVal(hostArray.eq(i));
            if (!withoutPrivHost) {
                var privNameOrIp = getVal(hostPrivateArray.eq(i));
            }
            if (nameOrIP.length > 0) {
                allHosts.push(nameOrIP);
                if (!withoutPrivHost && (privNameOrIp.length > 0)) {
                    allPrivHosts.push(privNameOrIp);
                }
            } else {
                if (!withoutPrivHost && (privNameOrIp.length > 0)) {
                    deferred.reject("No public name",
                        "You must provide a public name for all private names");
                    return (deferred.promise());
                }
            }
        }

        if (allHosts.length === 0) {
            deferred.reject("No hosts","You must install on at least 1 host");
            return (deferred.promise());
        }

        if (allPrivHosts.length !== 0 &&
            allPrivHosts.length !== allHosts.length) {
            deferred.reject("Private / Public Hostname Error",
            "Either provide private hostnames / IPs for all or none of the hosts");
            return (deferred.promise());
        }

        // Find dups
        for (i = 0; i < allHosts.length; i++) {
            if (allHosts.indexOf(allHosts[i], i+1) > -1) {
                deferred.reject("Duplicate Hosts",
                                "Public Hostname " + allHosts[i] +
                                " is a duplicate");
                return deferred.promise();
            }

            if (!withoutPrivHost) {
                if (allPrivHosts.indexOf(allPrivHosts[i], i+1) > -1) {
                    deferred.reject("Duplicate Hosts",
                                    "Private Hostname " + allPrivHosts[i] +
                                    " is a duplicate");
                    return deferred.promise();
                }
            }
        }

        res.hostnames = allHosts;
        res.privHostNames = allPrivHosts;
        deferred.resolve(res);
        return deferred.promise();
    };

    InstallerCommon.validateInstallationDirectory = function($form) {
        var deferred = jQuery.Deferred();
        var res = {};
        res.installationDirectory = null;
        if ($form.find(".installationDirectorySection").length === 0) {
            deferred.resolve(res);
            return deferred.promise();
        }
        var installationDirectory = getVal($form.find(".installationDirectorySection input"));
        if (installationDirectory.length === 0) {
            deferred.reject(
                "Empty Installation Directory",
                "Please assign a value to Installation Directory"
            );
        } else {
            res.installationDirectory = removeDuplicateSlash(installationDirectory);
            deferred.resolve(res);
        }
        return deferred.promise();
    };

    InstallerCommon.validateSerializationDirectory = function($form) {
        var deferred = jQuery.Deferred();
        var res = {};
        res.serializationDirectory = null;
        var serializationDirectory = getVal($form.find(".serializationDirectorySection input"));
        if (serializationDirectory.length === 0) {
            deferred.resolve(res);
        } else {
            res.serializationDirectory = removeDuplicateSlash(serializationDirectory);
            deferred.resolve(res);
        }
        return deferred.promise();
    };

    InstallerCommon.validateCredentials = function($form) {
        var deferred = jQuery.Deferred();
        var res = {};
        res.credentials = {};
        var $hostInputs = $form.find(".hostUsername input:visible");
        var passOption = $form.find(".passwordChoice .active").data("option");
        for (var i = 0; i < $hostInputs.length; i++) {
            if ($hostInputs.eq(i).val().trim().length === 0) {
                deferred.reject("Empty Username / Port",
                                "Your SSH username / port cannot be empty.");
                return deferred.promise();
            }
        }
        res.username = getVal($hostInputs.eq(0));
        res.port = getVal($hostInputs.eq(1));

        switch (passOption) {
            case ("password"):
                if ($form.find(".hostPassword input").val().length === 0) {
                    deferred.reject("Empty Password",
                                    "For passwordless ssh, upload your ssh key");
                } else {
                    res.credentials.password = $form.find(".hostPassword input").val();
                    deferred.resolve(res);
                }
                break;
            case ("sshKey"):
                if (getVal($form.find(".hostSshKey textarea")).length === 0) {
                    deferred.reject("Empty Ssh Key",
                              "Your ssh key is generally located at ~/.ssh/id_rsa");
                } else {
                    res.credentials.sshKey = getVal($form.find(".hostSshKey textarea"));
                    deferred.resolve(res);
                }
                break;
            case ("sshUserSettings"):
                res.credentials.sshUserSettings = true;
                deferred.resolve(res);
                break;
            default:
                deferred.reject("Illegal Password Option",
                            "Not a legal password option");
        }
        return deferred.promise();
    };

    InstallerCommon.validateLdap = function($form) {
        var deferred = jQuery.Deferred();
        var res = {};
        res.ldap = {};

        var $params = $form.find(".ldapParams:visible");
        // Check that all fields are populated
        var allPopulated = true;

        // $params.find("input").each(function(idx, val) {
        //     if ($.trim($(val).val()).length === 0) {
        //         allPopulated = false;
        //     }
        // });

        for (i = 0; i < 4; i += 1) {
            if ($.trim($params.find("input").eq(i).val()).length === 0) {
                allPopulated = false;
            }
        }

        if (!allPopulated) {
            return deferred.reject("Blank arguments",
                                   "Please populate all fields").promise();
        }

        if ($params.hasClass("xcalarLdapOptions")) {
            // Xcalar LDAP
            // Check that passwords are the same
            if ($params.find("input").eq(1).val() !==
                $params.find("input").eq(2).val()) {
                deferred.reject("Passwords different",
                                       "Passwords must be the same");
            } else {
                res.ldap = {
                    "xcalarInstall": true,
                    "domainName": getVal($params.find("input").eq(0)),
                    "password": getVal($params.find("input").eq(1)),
                    "companyName": getVal($params.find("input").eq(3)),
                };
                deferred.resolve(res);
            }
        } else {
            // Customer LDAP
            // Check that all the radio buttons are selected
            if (!$form.find("#ADChoice .active").length) {
                deferred.reject("AD or OpenLDAP",
                                      "Please select AD or OpenLDAP").promise();
            } else if (!$form.find("#TLSChoice .active").length) {
                deferred.reject("TLS",
                                  "Please select whether to use TLS").promise();
            } else {
                res.ldap = {
                    "xcalarInstall": false,
                    "ldap_uri": getVal($params.find("input").eq(0)),
                    "userDN": getVal($params.find("input").eq(1)),
                    "searchFilter": getVal($params.find("input").eq(2)),
                    "serverKeyFile": getVal($params.find("input").eq(3)),
                    "activeDir": $form.find("#ADChoice .radioButton.active")
                                       .data("option"),
                    "useTLS": $form.find("#TLSChoice .radioButton.active")
                                   .data("option"),
                    "ldapConfigEnabled": true
                };
                if (res.ldap.activeDir) {
                    res.ldap.adUserGroup = getVal($params.find("input").eq(4));
                    res.ldap.adAdminGroup = getVal($params.find("input").eq(5));
                    res.ldap.adDomain = getVal($params.find("input").eq(6));
                    res.ldap.adSubGroupTree = $form.find(".checkbox.adSubGroupTree")
                        .hasClass("checked");

                    var propArray = [ 'adUserGroup', 'adAdminGroup',
                                      'adDomain', 'adSubGroupTree' ];
                    for (var ii = 0; ii < propArray.length; ii++) {
                        if (res.ldap[propArray[ii]].length === 0) {
                            delete res.ldap[propArray[ii]];
                        }
                    }
                }
                deferred.resolve(res);
            }
        }
        return deferred.promise();
    };

    InstallerCommon.validateSettings = function($form) {
        var deferred = jQuery.Deferred();
        var result = {};
        InstallerCommon.validateHosts($form)
        .then(function(res) {
            jQuery.extend(result, res);
            return InstallerCommon.validateInstallationDirectory($form);
        })
        .then(function(res) {
            jQuery.extend(result, res);
            return InstallerCommon.validateSerializationDirectory($form);
        })
        .then(function(res) {
            jQuery.extend(result, res);
            return InstallerCommon.validateCredentials($form);
        })
        .then(function(res) {
            jQuery.extend(result, res);
            jQuery.extend(finalStruct, result);
            deferred.resolve();
        })
        .fail(function(arg1, arg2) {
            deferred.reject(arg1, arg2);
        });
        return deferred.promise();
    };

    function findStepId($form, $forms) {
        var curStepNo = -1;
        for (var i = 0; i < $forms.length; i++) {
            if ($forms.eq(i).attr("id") === $form.attr("id")) {
                curStepNo = i;
                break;
            }
        }
        if (curStepNo < 0) {
            console.error("Invalid form id");
            return -1;
        }
        return (curStepNo);
    }

    function showStep(stepNum, $forms) {
        var lastStep = $forms.length - 1;
        if (stepNum > lastStep) {
            return;
        }
        var $form = $forms.eq(stepNum);
        clearForm($form);
        $forms.addClass("hidden");
        $form.removeClass("hidden");
    }

    InstallerCommon.prepareStart = function($form, doingString, doingLower) {
        $form.find(".row .curStatus").text(doingLower);
        var $exeButton = $form.find(".next");
        $exeButton.val(doingString).addClass("inactive");
        $form.find("input.back").addClass("inactive").hide();
        $form.find("input.cancel").removeClass("hidden");
    };

    InstallerCommon.startOperation = function(startApi) {
        return InstallerCommon.sendViaHttps("POST", startApi, JSON.stringify(finalStruct));
    };

    InstallerCommon.getStatus = function($form, statusApi) {
        var deferred = jQuery.Deferred();
        var intervalTimer;
        var checkInterval = 2000;
        clearInterval(intervalTimer);
        intervalTimer = setInterval(function() {
            if (cancel) {
                cancel = false;
                $form.find("input.cancel").val("CANCEL");
                clearInterval(intervalTimer);
                intervalTimer = undefined;
                deferred.reject("Cancelled", "Operation cancelled");
            } else {
                if (intervalTimer) {
                    InstallerCommon.sendViaHttps("POST", statusApi, JSON.stringify(finalStruct))
                    .then(function(hints, ret) {
                        if (ret.curStepStatus === installStatus.Done) {
                            done = true;
                            clearInterval(intervalTimer);
                            intervalTimer = undefined;
                            deferred.resolve();
                        } else if (ret.curStepStatus === installStatus.Error) {
                            if (ret.errorLog) {
                                console.log(ret.errorLog);
                            }
                            clearInterval(intervalTimer);
                            intervalTimer = undefined;
                            deferred.reject("Status Error", ret);
                        }
                        if (!done) {
                            InstallerCommon.updateStatus($form, ret.retVal);
                        }
                    })
                    .fail(function() {
                        clearInterval(intervalTimer);
                        intervalTimer = undefined;
                        deferred.reject("Connection Error",
                                        "Connection to server cannot be " +
                                        "established. " +
                                        "Please contact Xcalar Support.");
                    });
                }
            }
        }, checkInterval);
        return deferred.promise();
    };

    function showFailure($form, args) {
        for (var i = 0; i < args.length; i++) {
            if (!args[i]) {
                args[i] = "Unknown Error";
            }
        }
        if (!args[1]) {
            args[1] = "Error";
        }
        $error = $($form).find(".error");
        $error.find("span").eq(0).html(args[0] + "<br>");
        $error.find("span").eq(1).html(args[1]);
        $error.show();
    }

    function clearForm($form, withReset) {
        if (withReset) {
            $form[0].reset();
            if ($form.find("#numServers").length > 0) {
                clearNumberServer($form);
            }
        }
        $form.find(".error").hide();
        function clearNumberServer($form) {
            $form.prop("disabled", false);
            $form.find(".hostnameSection").addClass("hidden");
            $form.find(".credentialSection").addClass("hidden");
            $form.find(".installationDirectorySection").addClass("hidden");
            $form.find(".serializationDirectorySection").addClass("hidden");
            $form.find(".title").addClass("hidden");
            $form.find(".title").eq(0).removeClass("hidden");
            $form.find(".row .curStatus").text("");
            $("#installButton").addClass("hidden");
            $("#serversButton").removeClass("hidden");
        }
    }

    function clearAllForms() {
        var $forms = $("form");
        for (var i = 0; i < $forms.length; i++) {
            clearForm($forms.eq(i), true);
        }
    }

    InstallerCommon.handleComplete = function($form) {
        var $rows = $form.find(".row .curStatus");
        for (var i = 0; i < $rows.length; i++) {
            var $row = $($rows[i]);
            $row.text("Complete!");
        }
    };

    InstallerCommon.handleFail = function($form, prevString, doingLower) {
        $form.find("input.next").val(prevString).removeClass("inactive");
        $form.find("input.back").removeClass("inactive").show();
        $form.find("input.cancel").addClass("hidden");
        setTimeout(function() {
            $form.find(".animatedEllipsis").remove();
        }, 1000);

        var $rows = $form.find(".row .curStatus");
        for (var i = 0; i < $rows.length; i++) {
            var $row = $($rows[i]);
            var status = $row.text();
            if (status.indexOf(doingLower) === 0) {
                $row.text("Failed");
                continue;
            }
            if (status.indexOf("(") === -1) {
                continue;
            }
            var revS = status.split('').reverse().join('');
            var endIndex = status.length - revS.indexOf("(");
            var noStatus = status.substring(0, endIndex-1);
            $row.text(noStatus+"(Cancelled)");
        }
    };

    InstallerCommon.finalize = function($form, isTarball) {
        // This function is called when everything is done.
        // Maybe we can remove the installer here?
        // Redirect to first node's index
        var hostname = finalStruct.hostnames[0];
        var port = 443;
        var tarballPort = 8443;
        $form.find(".btn.next").val("LAUNCH XD")
             .removeClass('next')
             .removeClass('inactive')
             .addClass("redirect");
        $form.find(".redirect").click(function() {
            if (isTarball) {
                // tarball installer
                window.location = "https://" + hostname + ":" + tarballPort;
            } else {
                window.location = "https://" + hostname + ":" + port;
            }
        });
        $form.find(".section").hide();
        $form.find(".title").hide();
        $form.find(".successSection").show();
        $form.find(".buttonSection").show();
        if ($form.find(".btn.clear").length > 0) {
            $form.find(".btn.clear").hide();
        }
        $form.find(".btn.back").hide();
        $form.find(".btn.cancel").hide();
    };

    function radioAction($radioButtonGroup, $activeRadio, $form) {
        $radioButtonGroup.find("> .radioButton").removeClass("active");
        $activeRadio.addClass("active");
        var radioGroup = $radioButtonGroup.attr("id");
        var radioOption = $activeRadio.data("option");
        switch (radioGroup) {
            case ("installChoice"):
                $("#choiceForm .btn.next").removeClass("btn-disabled");
                $("#formArea").removeClass("install")
                              .removeClass("upgrade")
                              .removeClass("uninstall")
                              .addClass(radioOption);
                $("#installerContainer").removeClass("install")
                              .removeClass("upgrade")
                              .removeClass("uninstall")
                              .addClass(radioOption);
                clearAllForms();
                break;
            case ("preConfigChoice"):
            case ("preConfigUpgradeChoice"):
                switch (radioOption) {
                    // Xcalar Deployed Shared Storage
                    case ("yes"):
                        $(".container").addClass("preConfig");
                        break;
                    // Existing Shared Storage to be Mounted
                    case ("no"):
                        $(".container").removeClass("preConfig");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("nfsChoice"):
            case ("upgradeNfsChoice"):
                $form.find(".customerNfsOptions").hide();
                $form.find(".readyNfsOptions").hide();
                switch (radioOption) {
                    // Xcalar Deployed Shared Storage
                    case ("xcalarNfs"):
                        break;
                    // Existing Shared Storage to be Mounted
                    case ("customerNfs"):
                        $form.find(".customerNfsOptions").show();
                        $form.find(".readyNfsOptions input").val("");
                        break;
                    // Existing Shared Storage Already Mounted
                    case ("readyNfs"):
                        $form.find(".readyNfsOptions").show();
                        $form.find(".customerNfsOptions input").val("");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("passwordChoice"):
            case ("uninstallPasswordChoice"):
            case ("upgradePasswordChoice"):
                $form.find(".hostSshKey").hide();
                $form.find(".hostPassword").hide();
                switch (radioOption) {
                    case ("password"):
                        $form.find(".hostPassword").show();
                        break;
                    case ("sshKey"):
                        $form.find(".hostSshKey").show();
                        break;
                    case ("sshUserSettings"):
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("ldapDeployChoice"):
                switch (radioOption) {
                    case ("customerLdap"):
                        $form.find(".customerLdapOptions").removeClass("hidden");
                        $form.find(".xcalarLdapOptions").addClass("hidden");
                        break;
                    case ("xcalarLdap"):
                        $form.find(".xcalarLdapOptions").removeClass("hidden");
                        $form.find(".customerLdapOptions").addClass("hidden");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("TLSChoice"):
                break;
            case ("ADChoice"):
                var inputs;
                switch (radioOption) {
                    case (true):
                        // AD
                        inputs = $form.find(".fieldWrap .inputWrap input");
                        inputs.eq(4).attr("placeholder",
                                            "[ADServer.company.com]");
                        inputs.eq(5).attr("placeholder",
                                          "[dc=company,dc=com]");
                        inputs.eq(6).attr("placeholder",
                       "[(&(objectclass=user)(userPrincipalName=%username%))]");
                        inputs.eq(7).attr("placeholder",
                                        "[/etc/pki/tls/cert.pem]");
                        $form.find(".ADOnly").show();
                        break;
                    case (false):
                        // LDAP
                        inputs = $form.find(".fieldWrap .inputWrap input");
                        inputs.eq(4).attr("placeholder",
                                         "[ADServer.company.com]");
                        inputs.eq(5).attr("placeholder",
                         "[mail=%username%,ou=People,dc=company,dc=com]");
                        inputs.eq(6).attr("placeholder",
                  "[(memberof=cn=users,ou=Groups,dc=company,dc=com)]");
                        inputs.eq(7).attr("placeholder",
                                        "[/etc/pki/tls/cert.pem]");
                        $form.find(".ADOnly").hide();
                        break;
                }
                break;
            case ("copyChoice"):
                break;
            default:
                console.error("Unexpected radio group!");
                break;
        }
    }

    InstallerCommon.validateDiscover = function($form, $forms) {
        var deferred = jQuery.Deferred();
        var result = {};
        InstallerCommon.validateHosts($form, true)
        .then(function(res) {
            jQuery.extend(result, res);
            return InstallerCommon.validateInstallationDirectory($form);
        })
        .then(function(res) {
            jQuery.extend(result, res);
            return InstallerCommon.validateCredentials($form);
        })
        .then(function(res) {
            jQuery.extend(result, res);
            jQuery.extend(finalStruct, result);
            return InstallerCommon.sendViaHttps("POST", discoverApi, JSON.stringify(finalStruct));
        })
        .then(function(hints, res) {
            discoverResult = res.discoverResult;
            appendHostsHtml(discoverResult.hosts);
            appendMountPoint(discoverResult.xcalarMount);
            finalStruct.hostnames = discoverResult.hosts;
            finalStruct.privHostNames = discoverResult.privHosts;
            finalStruct.ldap = discoverResult.ldapConfig;
            finalStruct.ldap.xcalarInstall = false;
            if (discoverResult.xcalarSerDes) {
                finalStruct.serializationDirectory = discoverResult.xcalarSerDes;
            }
            deferred.resolve();
        })
        .fail(function(arg1, arg2) {
            deferred.reject(arg1, arg2);
        });
        return deferred.promise();

        function appendHostsHtml(hosts) {
            var html = "";
            for (var i = 0; i < hosts.length; i++) {
                html += hostnameHtml(hosts[i]);
            }
            $forms.closest(".hostList").find(".row:not(.header)").remove();
            $forms.closest(".hostList").find(".row.header").after(html);
            function hostnameHtml(host) {
                return '<div class="row">' +
                    '<div class="leftCol hostname">' +
                      '<div class="publicName">' +
                        '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                        'value=" ' + host + '"' + 'name="useless" disabled>' +
                        '<div class="bar">Public</div>' +
                      '</div>' +
                    '</div>' +
                    '<div class="rightCol status">' +
                      '<span class="curStatus">' +
                        '----' +
                      '</span>' +
                    '</div>' +
                '</div>';
            }
        }

        function appendMountPoint(xcalarMount) {
            if (xcalarMount && xcalarMount.server) {
                var $server = $forms.closest("form.shareStorage").find(".discoverServer .text");
                if ($server.length > 0) {
                    $server.text(xcalarMount.server);
                }
            }
            if (xcalarMount && xcalarMount.path) {
                $path = $forms.closest("form.shareStorage").find(".discoverMountPath .text");
                if ($path.length > 0) {
                    $path.text(xcalarMount.path);
                }
            }
        }
    };

    InstallerCommon.prepareUninstall = function() {
        finalStruct.nfsOption = {};
        switch (discoverResult.xcalarMount.option) {
            case 'customerNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                finalStruct.nfsOption.nfsServer = discoverResult.xcalarMount.server;
                finalStruct.nfsOption.nfsMountPoint = discoverResult.xcalarMount.path;
                break;
            case 'readyNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                finalStruct.nfsOption.nfsReuse = discoverResult.xcalarMount.path;
                break;
            case 'xcalarNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                break;
        }
    };

    InstallerCommon.sendViaHttps = function(action, url, arrayToSend) {
        return sendViaHttps(action, url, arrayToSend);
    };

    InstallerCommon.updateStatus = function($form, ret) {
        for (var i = 0; i < ret.length; i++) {
            $form.find(".row .curStatus").eq(i).text(ret[i]);
            if (ret[i].indexOf("(Done)") === -1) {
                addMovingDots($form.find(".row .curStatus").eq(i));
            }
        }

        function addMovingDots($ele) {
            var text = $ele.text().trim();
            var html = '<div class="animatedEllipsisWrapper">' +
                            '<div class="text">' +
                                text +
                            '</div>' +
                            '<div class="animatedEllipsis">' +
                              '<div>.</div>' +
                              '<div>.</div>' +
                              '<div>.</div>' +
                            '</div>' +
                        '</div>';
            $ele.html(html);
        }
    };

    InstallerCommon.showErrorModal = function(ret) {
        if (ret) {
            ErrorMessage.show({
                "errorCode": ret.status,
                "description": "Unknown",
                "errorMessage": ret.errorLog,
                "installationLogs": ret.installationLogs
            });
        }
    };

    InstallerCommon.appendHostsHtml = function(hosts, $form) {
        var html = "";
        for (var i = 0; i < hosts.length; i++) {
            html += hostnameHtml(hosts[i]);
        }
        $form.find(".row").last().after(html);
        function hostnameHtml(host) {
            return '<div class="row">' +
                '<div class="leftCol hostname">' +
                  '<div class="publicName">' +
                    '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                    'value=" ' + host + '"' + 'name="useless" disabled>' +
                    '<div class="bar">Public</div>' +
                  '</div>' +
                '</div>' +
                '<div class="rightCol status">' +
                  '<span class="curStatus">' +
                    '----' +
                  '</span>' +
                '</div>' +
            '</div>';
        }
    };

    function getVal($ele) {
        return $($ele).val().trim();
    }

    function removeDuplicateSlash(input) {
        var output = input;
        if (input.indexOf("/") !== 0) {
            output = "/" + output;
        }
        if (output.charAt(output.length - 1) === "/") {
            output = output.substring(0, output.length - 1);
        }
        return output;
    }

    // The hint is the first parameter, while the return JSON object is the second parameter
    function sendViaHttps(action, url, arrayToSend) {
        var deferred = jQuery.Deferred();
        try {
            jQuery.ajax({
                method: action,
                url: document.location.origin + "/install" + url,
                data: arrayToSend,
                contentType: "application/json",
                success: function(ret) {
                    deferred.resolve("Request is handled successfully", ret);
                },
                error: function(ret, textStatus, xhr) {
                    if (xhr.responseJSON) {
                        // under this case, server sent the response and set
                        // the status code
                        deferred.reject("Return Status Error", xhr.responseJSON);
                    } else {
                        // under this case, the error status is not set by
                        // server, it may due to other reasons
                        deferred.reject("Connection Error",
                            "Connection to server cannot be established. " +
                            "Please contact Xcalar Support.");
                    }
                }
            });
        } catch (e) {
            // XXX Handle the different statuses and display relevant
            // error messages
            deferred.reject("Ajax Error");
        }
        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        InstallerCommon.__testOnly__ = {};
        InstallerCommon.__testOnly__.getVal = getVal;
        InstallerCommon.__testOnly__.removeDuplicateSlash = removeDuplicateSlash;
        InstallerCommon.__testOnly__.sendViaHttps = sendViaHttps;
        InstallerCommon.__testOnly__.findStepId = findStepId;
        InstallerCommon.__testOnly__.showStep = showStep;
        InstallerCommon.__testOnly__.showFailure = showFailure;

        InstallerCommon.__testOnly__.setSendViaHttps = function(f) {
            sendViaHttps = f;
        };
        InstallerCommon.__testOnly__.setCancel = function(bool) {
            cancel = bool;
        };
        InstallerCommon.__testOnly__.setDone = function(bool) {
            done = bool;
        };
        InstallerCommon.__testOnly__.radioAction = radioAction;

        InstallerCommon.__testOnly__.finalStruct = finalStruct;
        InstallerCommon.__testOnly__.discoverResult = discoverResult;

        InstallerCommon.__testOnly__.setDiscoverResult = function(discoverResultObj) {
            discoverResult = discoverResultObj;
        };
    }
    /* End Of Unit Test Only */

    return (InstallerCommon);
}({}, jQuery));

window.onbeforeunload = function (e) {
  return true;
};

$(document).ready(function() {
    Installer.setup();
    Upgrader.setup();
    Uninstaller.setup();
    setupTooltip();

    function setupTooltip() {
        $("body").tooltip({
            "selector": '[data-toggle="tooltip"]',
            "html": true,
            "delay": {
                "show": 250,
                "hide": 100
            }
        });

        // element's delay attribute will take precedence - unique for xcalar
        $("body").on("mouseenter", '[data-toggle="tooltip"]', function() {
            $(".tooltip").hide();
        });
    }
});
