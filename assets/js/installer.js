window.Installer = (function(Installer, $) {

    var finalStruct = {
        "nfsOption": undefined,
        "hostnames": [],
        "privHostNames": [],
        "username": "",
        "port": 22,
        "credentials": {}, // Either password or sshKey
        "installationDirectory": null
    };

    var installStatus = {
        "Error": -1,
        "Running": 1,
        "Done": 2
    };

    var intervalTimer;
    var licenseCheckingApi = "/xdp/license/verification";
    var installationStatusApi = "/xdp/installation/status";
    var installationStartApi = "/xdp/installation/start";
    // var installationFinishApi = "/xdp/installation/finish";
    // var installationCancelApi = "/xdp/installation/cancel";
    var ldapInstallApi = "/ldap/installation";
    var ldapConfigApi = "/ldap/config";
    // var statusApi;
    var checkInterval = 2000; // How often to check for status

    var $forms = $("form");
    var lastStep = 4; // Last step of form
    var numServers = 4;
    var cancel = false;
    var done = false;
    var port = 443;
    var tarballPort = 8443;

    Installer.clearInterval = function() {
        if (intervalTimer) {
            clearInterval(intervalTimer);
        }
    };

    Installer.setup = function() {
        // Set up submit buttons and back buttons for all screens
        $(".buttonSection").on("click", "input.next", function() {
            var curFormId = $(this).closest("form").attr("id");
            var curStepId = findStepId(curFormId);
            validateCurrentStep(curStepId)
            .then(function() {
                setupNextStep(curStepId);
                Installer.showStep(curStepId + 1);
            })
            .fail(function() {
                showFailure(curStepId, arguments);
            });
        });

        // $(".buttonSection").on("click", "input.ldap", function() {
        //     // This is special-cased because the same input button is
        //     // clicked twice. Once for the submission of the install
        //     // and once to go to the next screen. After the install is complete
        //     // The button's .next class is removed and replaced with .ldap to
        //     // trigger this action
        //     var curFormId = $(this).closest("form").attr("id");
        //     var curStepId = findStepId(curFormId);
        //     Installer.showStep(curStepId+1);
        // });

        $(".buttonSection").on("click", "input.back", function() {
            var curFormId = $(this).closest("form").attr("id");
            var curStepId = findStepId(curFormId);

            Installer.showStep(curStepId - 1);
        });

        $(".buttonSection").on("click", "input.servers", function() {
            step3Helper();
        });

        $(".buttonSection").on("click", "input.clear", function() {
            var $form = $(this).closest("form");
            // Clear inputs
            $form[0].reset();
            // Hide errors
            $form.find(".error").hide();
            // Clear out contentEditables
            $form.find("[contenteditable='true']").html("");
        });

        // Set up listeners for radioButtons
        $(".radioButton").click(function() {
            // If option is the same as before, ignore and return
            if ($(this).hasClass("active")) {
                return;
            }
            $(this).closest(".radioButtonGroup").find(".radioButton")
                   .removeClass("active");
            $(this).addClass("active");

            var radioButtonGroup = $(this).closest(".radioButtonGroup")
                                          .attr("id");
            radioAction(radioButtonGroup, $(this).data("option"));
        });

        // Set up step's listeners
        setUpStep1();
        setUpStep2();
        setUpStep3();
        setUpStep4();
        ErrorMessage.setup();
    };

    Installer.showStep = function(stepNum) {
        if (stepNum > lastStep) {
            return;
        }
        $forms.addClass("hidden");
        $forms.eq(stepNum).removeClass("hidden");
    };

    function findStepId(curFormId) {
        var curStepNo = -1;
        for (var i = 0; i<$forms.length; i++) {
            if ($forms.eq(i).attr("id") === curFormId) {
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

    function radioAction(radioGroup, radioOption) {
        switch (radioGroup) {
            case ("installChoice"):
                switch (radioOption) {
                    case ("install"):
                        // install
                        $("#choiceForm .btn.next").removeClass("btn-disabled");
                        break;
                    case ("uninstall"):
                        // uninstall
                        $("#choiceForm .btn.next").addClass("btn-disabled");
                        break;
                    case ("upgrade"):
                        // upgrade
                        $("#choiceForm .btn.next").addClass("btn-disabled");
                        break;
                }
                break;
            case ("nfsOption"):
                $(".customerNfsOptions").hide();
                $(".readyNfsOptions").hide();
                switch (radioOption) {
                    // Xcalar Deployed Shared Storage
                    case ("xcalarNfs"):
                        break;
                    // Existing Shared Storage to be Mounted
                    case ("customerNfs"):
                        $("#sharedStorageForm .customerNfsOptions").show();
                        $("#sharedStorageForm .readyNfsOptions")
                        .find("input").val("");
                        break;
                    // Existing Shared Storage Already Mounted
                    case ("readyNfs"):
                        $("#sharedStorageForm .readyNfsOptions").show();
                        $("#sharedStorageForm .customerNfsOptions")
                        .find("[contenteditable='true']").html("");
                        $("#sharedStorageForm .customerNfsOptions")
                        .find("input").val("");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("passOption"):
                $(".hostSshKey").hide();
                $(".hostPassword").hide();
                switch (radioOption) {
                    case ("password"):
                        $(".hostPassword").show();
                        break;
                    case ("sshKey"):
                        $(".hostSshKey").show();
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("ldapDep"):
                switch (radioOption) {
                    case ("customerLdap"):
                        $(".customerLdapOptions").removeClass("hidden");
                        $(".xcalarLdapOptions").addClass("hidden");
                        break;
                    case ("xcalarLdap"):
                        $(".xcalarLdapOptions").removeClass("hidden");
                        $(".customerLdapOptions").addClass("hidden");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("useTLS"):
                break;
            case ("AD"):
                switch (radioOption) {
                    case (true):
                        // AD
                        var inputs = $(".fieldWrap .inputWrap input");
                        inputs.eq(0).attr("placeholder",
                                            "[ldap://pdc1.int.xcalar.com:389]");
                        inputs.eq(1).attr("placeholder",
                                          "[cn=users,dc=int,dc=xcalar,dc=net]");
                        inputs.eq(2).attr("placeholder",
                       "[(&(objectclass=user)(userPrincipalName=%username%))]");
                        inputs.eq(3).attr("placeholder",
                                        "[/etc/ssl/certs/ca-certificates.crt]");
                        break;
                    case (false):
                        // LDAP
                        var inputs = $(".fieldWrap .inputWrap input");
                        inputs.eq(0).attr("placeholder",
                                         "[ldap://openldap1-1.xcalar.net:389]");
                        inputs.eq(1).attr("placeholder",
                         "[mail=%username%,ou=People,dc=int,dc=xcalar,dc=com]");
                        inputs.eq(2).attr("placeholder",
                  "[(memberof=cn=xceUsers,ou=Groups,dc=int,dc=xcalar,dc=com)]");
                        inputs.eq(3).attr("placeholder",
                                        "[/etc/ssl/certs/ca-certificates.crt]");
                        break;
                }
                break;
            default:
                console.error("Unexpected radio group!");
                break;
        }
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
                        deferred.reject("Connection Error" +
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

    function setUpStep1() {
        $(".licenseKey").focus();
    }

    function setUpStep2() {
    }

    function setUpStep4() {

    }

    function step3Helper() {
        numServers = $("#numServers").val();
        var html = "";
        var i;

        var curNum = $(".row").length - 1;
        if (curNum < numServers) {
            // Add extra rows at bottom
            var extraRows = numServers - curNum;
            for (i = 0; i < extraRows; i++) {
                html += hostnameHtml(i + 1 + curNum);
            }
            $(".row").last().after(html);
        } else if (curNum > numServers) {
            // Remove from the bottom
            var toRemove = curNum - numServers;
            for (i = 0; i < toRemove; i++) {
                $(".row").last().remove();
            }
        }

        $(".hostnameSection").removeClass("hidden");
        $(".credentialSection").removeClass("hidden");
        $(".installationDirectorySection").removeClass("hidden");
        $(".title").removeClass("hidden");
        $("#installButton").removeClass("hidden");
        $("#serversButton").addClass("hidden");
    }

    function setUpStep3() {
        $("#numServers").on("keyup", function(e) {
            var keyCode = e.which;
            if (keyCode === 13) {
                step3Helper();
            }
        });

        $("input.cancel").click(function() {
            cancel = true;
            $(this).val("CANCELLING");
            $(this).addClass("inactive");
        });

        $(document).on("keydown", ".ipOrFqdn", function(e) {
            // For chrome or something like that
            if (e.which === 38) {
                e.preventDefault();
            }
        });

        $(document).on("keypress", ".ipOrFqdn", function(e) {
            // For safari or something like that
            if (e.which === 38) {
                e.preventDefault();
            }
        });

        $(document).on("keyup", ".ipOrFqdn", function(e) {
            var keyCode = e.which;
            if (keyCode === 38) {
                // keyup
                if ($(this).closest(".row").index() - 1 > 0) {
                    $(this).closest(".row").prev().find("input").focus();
                    // -1 because of header row
                }
            } else if (keyCode === 40) {
                var numKids = $(this).closest(".hostnameSection").find(".row")
                                     .length;
                // keydown
                if ($(this).closest(".row").index() + 1 === numKids) {
                    // -1 because of header row
                } else {
                    var $input = $(this).closest(".row").next().find("input");
                    $input.focus();
                    $input.caret($input.val().length);
                }
            }
        });
    }

    function validateCurrentStep(stepId) {
        $(".error").hide();
        switch (stepId) {
            case (0):
                var deferred = $.Deferred();
                return deferred.resolve().promise();
            case (1):
                $(".invalidLicense").hide();
                return validateKey();
            case (2):
                return validateNfs();
            case (3):
                return validateCredentials();
            case (4):
                return validateLdap();
            default:
                console.error("Unexpected step");
                break;
        }
    }

    function validateKey() {
        var deferred = jQuery.Deferred();
        var finalKey = $(".licenseKey").val();

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
    }
    function checkLicense(license) {
        return sendViaHttps("POST", licenseCheckingApi,
                            JSON.stringify({"licenseKey": license}));
    }

    function validateNfs() {
        var deferred = jQuery.Deferred();
        var nfsOption = $(".nfsOption.radioButton.active").data("option");
        if (nfsOption === "xcalarNfs") {
            finalStruct.nfsOption = {};
            deferred.resolve();
        } else if (nfsOption === "customerNfs") {
            if ($("#nfsServer").val().trim().length === 0) {
                deferred.reject("NFS Server Invalid",
                    "You must provide a valid NFS Server IP or FQDN");
            } else {
                finalStruct.nfsOption = {};
                finalStruct.nfsOption.nfsServer = $("#nfsServer").val().trim();
                // avoid duplicate "/" at the head
                var mountPoint = $("#nfsMountPoint").val().trim();
                mountPoint = (mountPoint.indexOf("/") === 0)? mountPoint : ("/" + mountPoint);
                // Remove the "/" at tail
                if (mountPoint.charAt(mountPoint.length - 1) === "/") {
                    mountPoint = mountPoint.substring(0, mountPoint.length - 1);
                }
                finalStruct.nfsOption.nfsMountPoint = mountPoint;
                finalStruct.nfsOption.nfsUsername = $("#nfsUserName").val()
                                                                     .trim();
                finalStruct.nfsOption.nfsGroup = $("#nfsUserGroup").val()
                                                                   .trim();
                deferred.resolve();
            }
        } else {
            if ($("#nfsMountPointReady").val().trim().length === 0) {
                deferred.reject("NFS Mount Path Invalid",
                    "You must provide a valid NFS Mount Path");
            } else {
                $("#sharedStorageForm .nfsSection").addClass("lock");
                var path = $("#nfsMountPointReady").val().trim();
                finalStruct.nfsOption = {};
                finalStruct.nfsOption.nfsReuse = path;
                $("#sharedStorageForm").removeClass("lock");
                deferred.resolve();
            }
        }
        return deferred.promise();
    }

    function validateCredentials() {
        var deferred = jQuery.Deferred();
        if (done) {
            return deferred.resolve().promise();
        }

        var $hostInputs = $(".hostUsername input:visible");
        var i;
        for (i = 0; i<$hostInputs.length; i++) {
            if ($hostInputs.eq(i).val().trim().length === 0) {
                deferred.reject("Empty Username / Port",
                                "Your SSH username / port cannot be empty.");
                return deferred.promise();
            }
        }

        finalStruct.username = $(".hostUsername input:visible").eq(0).val()
                                                               .trim();
        finalStruct.port = $(".hostUsername input:visible").eq(1).val().trim();
        var passOption = $(".passOption.active").data("option");
        if (passOption === "password") {
            if ($(".hostPassword input").val().length === 0) {
                deferred.reject("Empty Password",
                                "For passwordless ssh, upload your ssh key");
                return deferred.promise();
            } else {
                finalStruct.credentials = {};
                finalStruct.credentials.password = $(".hostPassword input")
                                                                         .val();
            }
        } else if (passOption === "sshKey") {
            if ($(".hostSshKey textarea").val().trim().length === 0) {
                deferred.reject("Empty Ssh Key",
                          "Your ssh key is generally located at ~/.ssh/id_rsa");
                return deferred.promise();
            } else {
                finalStruct.credentials = {};
                finalStruct.credentials.sshKey = $(".hostSshKey textarea").val()
                                                                        .trim();
            }
        } else {
            deferred.reject("Illegal Password Option",
                            "Not a legal password option");
            return deferred.promise();
        }

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");
        var allHosts = [];
        var allPrivHosts = [];
        for (i = 0; i<hostArray.length; i++) {
            var nameOrIP = hostArray.eq(i).val().trim();
            var privNameOrIp = hostPrivateArray.eq(i).val().trim();
            if (nameOrIP.length > 0) {
                allHosts.push(nameOrIP);
                if (privNameOrIp.length > 0) {
                    allPrivHosts.push(privNameOrIp);
                }
            } else {
                if (privNameOrIp.length > 0) {
                    deferred.reject("No public name",
                        "You must provide a public name for all private names");
                    return deferred.promise();
                }
            }
        }

        if (allHosts.length === 0) {
            deferred.reject("No hosts","You must install on at least 1 host");
            return deferred.promise();
        }

        if (allPrivHosts.length !== 0 &&
            allPrivHosts.length !== allHosts.length) {
            deferred.reject("Private / Public Hostname Error",
         "Either provide private hostnames / IPs for all or none of the hosts");
            return deferred.promise();
        }

        // Find dups
        for (i = 0; i<allHosts.length; i++) {
            if (allHosts.indexOf(allHosts[i], i+1) > -1) {
                deferred.reject("Duplicate Hosts",
                                "Public Hostname " + allHosts[i] +
                                " is a duplicate");
                return deferred.promise();
            }

            if (allPrivHosts.indexOf(allPrivHosts[i], i+1) > -1) {
                deferred.reject("Duplicate Hosts",
                                "Private Hostname " + allPrivHosts[i] +
                                " is a duplicate");
                return deferred.promise();
            }
        }

        finalStruct.hostnames = allHosts;
        finalStruct.privHostNames = allPrivHosts;
        if ($(".installationDirectory input").length > 0) {
            var directory = $(".installationDirectory input").val().trim();
            if (directory === "") {
                deferred.reject("Empty Installation Directory",
                                "Please assign a value to Installation Directory");
                return deferred.promise();
            }
            // Remove the "/" at tail
            if (directory.charAt(directory.length - 1) === "/") {
                directory = directory.substring(0, directory.length - 1);
            }
            finalStruct.installationDirectory = directory;
        }
        // Execute array
        executeFinalArray()
        .then(function() {
            $("form").eq(2).find(".next").val("NEXT").removeClass("inactive");
            deferred.resolve();
        })
        .fail(function(arg1, arg2) {
            var options = {};
            options.errorCode = arg2.status;
            options.description = "Unknown";
            options.errorMessage = arg2.errorLog;
            options.installationLogs = arg2.installationLogs;
            ErrorMessage.show(options);
            deferred.reject.apply({}, arguments);
        });
        return deferred.promise();
    }

    function validateLdap() {
        var deferred = jQuery.Deferred();

        var $params = $(".ldapParams:not(.hidden)");
        // Check that all fields are populated
        var allPopulated = true;
        $params.find("input").each(function(idx, val) {
            if ($.trim($(val).val()).length === 0) {
                allPopulated = false;
            }
        });

        if (!allPopulated) {
            return deferred.reject("Blank arguments",
                                   "Please populate all fields").promise();
        }

        if ($params.hasClass("xcalarLdapOptions")) {
            // Xcalar LDAP
            // Check that passwords are the same
            if ($params.find("input").eq(1).val() !==
                $params.find("input").eq(2).val()) {
                return deferred.reject("Passwords different",
                                       "Passwords must be the same").promise();
            }
        } else {
            // Customer LDAP
            // Check that all the radio buttons are selected
            if (!$("#AD .active").length) {
                return deferred.reject("AD or OpenLDAP",
                                      "Please select AD or OpenLDAP").promise();
            }
            if (!$("#useTLS .active").length) {
                return deferred.reject("TLS",
                                  "Please select whether to use TLS").promise();
            }
        }
        console.log("verified");
        deferred.resolve();

        return deferred.promise();
    }

    function setupNextStep(curStepId) {
        switch (curStepId) {
            case (0):
                break;
            case (1):
                break;
            case (2):
                break;
            case (3):
                break;
            case (4):
                writeConfigFile()
                .then(finalize)
                .fail(function() {
                    showFailure(curStepId, arguments);
                });
                console.log("done!");
                break;
            default:
                return;
        }
    }

    function showFailure(curStepId, args) {
        for (var i = 0; i<args.length; i++) {
            if (!args[i]) {
                args[i] = "Unknown Error";
            }
        }
        if (!args[1]) {
            args[1] = "Error";
        }
        $error = $(".error").eq(curStepId);
        $error.find("span").eq(0).html(args[0] + "<br>");
        $error.find("span").eq(1).html(args[1]);
        $error.show();
    }

    function hostnameHtml() {
        return ('<div class="row">' +
            '<div class="leftCol hostname">' +
              '<div class="publicName">' +
                '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                'value="" ' +
                'name="useless" placeholder="[IP or FQDN]">' +
                '<div class="bar">Public</div>' +
              '</div>' +
              '<div class="privateName">' +
                '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                'value="" ' +
                'name="useless" placeholder="[IP or FQDN (Optional)]">' +
                '<div class="bar">Private</div>' +
              '</div>' +
            '</div>' +
            '<div class="rightCol status">' +
              '<span class="curStatus">' +
                '----' +
              '</span>' +
            '</div>' +
        '</div>');
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

    function executeFinalArray() {
        var deferred = jQuery.Deferred();

        // Send to backend for checking. clear up screen until we get ack / deny
        $(".credentialSection").hide();
        $(".credentialSection").prev().hide();
        $(".installationDirectorySection").hide();
        $(".installationDirectorySection").prev().hide();
        $("#numServers").prop("disabled", "true");
        // Remove all empty hostnames from screen. This happens when they don't
        // use all the licenses they bought
        var hostnames = $(".row:not(.header)");
        for (var i = 0; i<hostnames.length; i++) {
            if (hostnames.eq(i).find("input").val().trim().length === 0) {
                hostnames.eq(i).hide();
            } else {
                hostnames.eq(i).find(".hostname input")
                               .prop("disabled", "true");
            }
        }

        $("#installButton").val("INSTALLING...")
                           .addClass("inactive");
        $(".row .curStatus").text("Installing...");
        $("input.back").hide();
        $("input.cancel").removeClass("hidden");
        sendViaHttps("POST", installationStartApi, JSON.stringify(finalStruct))
        .then(function() {
            return (getStatus());
        })
        .then(function() {
            $(".curStatus").each(function(a, b) {
                $(b).text("Installation Complete");
            });
            deferred.resolve();
        })
        .fail(function() {
            $(".credentialSection").show();
            $(".credentialSection").prev().show();
            $(".installationDirectorySection").show();
            $(".installationDirectorySection").prev().show();
            $(".row:not(.header)").show();
            $(".row:not(.header) .hostname input").prop("disabled", false);
            $("#numServers").prop("disabled", false);
            $("#installButton").val("INSTALL")
                               .removeClass("inactive");
            $("input.back").removeClass("inactive");
            $("input.back").show();
            $("input.cancel").addClass("hidden");
            $("input.cancel").removeClass("inactive");
            setTimeout(function() {
                $(".animatedEllipsis").remove();
            });
            for (i = 0; i<$(".row .curStatus").length; i++) {
                var status = $(".row .curStatus").eq(i).text();
                if (status.indexOf("Installing...") === 0) {
                    $(".row .curStatus").eq(i).text("Failed");
                    continue;
                }
                if (status.indexOf("(") === -1) {
                    continue;
                }
                var revS = status.split('').reverse().join('');
                var endIndex = status.length - revS.indexOf("(");
                var noStatus = status.substring(0, endIndex-1);
                $(".row .curStatus").eq(i).text(noStatus+"(Cancelled)");
            }
            deferred.reject("Failed to install", arguments[1]);
        });

        return deferred.promise();
    }

    function writeConfigFile() {
        var deferred = jQuery.Deferred();

        // Lock the form
        $("#ldapForm").addClass("disabled");

        // Collect values based on the selection
        var values = $(".ldapParams:not(.hidden)").find("input")
        .map(function(a, b) {
            return $(b).val();
        });

        var struct;
        if ($(".ldapParams:not(.hidden)").hasClass("xcalarLdapOptions")) {
            struct = {
                "domainName": values[0],
                "password": values[1],
                "companyName": values[3]
            };

            console.log(struct);
            sendViaHttps("POST", ldapInstallApi, JSON.stringify(struct))
            .then(function() {
                $("#ldapForm").removeClass("disabled");
                deferred.resolve(httpStatus.OK);
            })
            .fail(function(hints, data) {
                $("#ldapForm").removeClass("disabled");
                deferred.reject(data);
            });
        } else {
            var adOption = $(".AD.radioButton.active").data("option");
            var tlsOption = $(".useTLS.radioButton.active").data("option");

            struct = {
                "ldap_uri": values[0],
                "userDN": values[1],
                "searchFilter": values[2],
                "serverKeyFile": values[3],
                "activeDir": adOption.toString(),
                "useTLS": tlsOption.toString()
            };

            console.log(struct);
            sendViaHttps("PUT", ldapConfigApi, JSON.stringify(struct))
            .then(function() {
                $("#ldapForm").removeClass("disabled");
                deferred.resolve(httpStatus.OK);
            })
            .fail(function(hints, data) {
                $("#ldapForm").removeClass("disabled");
                deferred.reject(data);
            });
        }
        return deferred.promise();
    }

    function getStatus() {
        var deferred = jQuery.Deferred();

        if (intervalTimer) {
            clearInterval(intervalTimer);
        }

        intervalTimer = setInterval(function() {
            if (cancel) {
                // deferred.reject("Cancelled", "Installation cancelled");
                cancel = false;
                $("input.cancel").val("CANCEL");
                clearInterval(intervalTimer);
                deferred.reject("Cancelled", "Installation cancelled");
            } else {
                sendViaHttps("POST", installationStatusApi, JSON.stringify(finalStruct))
                .then(function(hints, ret) {
                    if (ret.curStepStatus === installStatus.Done) {
                        done = true;
                        clearInterval(intervalTimer);
                        deferred.resolve();
                    } else if (ret.curStepStatus === installStatus.Error) {
                        if (ret.errorLog) {
                            console.log(ret.errorLog);
                        }
                        clearInterval(intervalTimer);
                        deferred.reject("Status Error", ret);
                    }
                    if (!done) {
                        // In case we have one last outstanding status check
                        // prior to the success being acked
                        updateStatus(ret.retVal);
                    }
                })
                .fail(function() {
                    clearInterval(intervalTimer);
                    deferred.reject("Connection Error",
                                    "Connection to server cannot be " +
                                    "established. " +
                                    "Please contact Xcalar Support.");
                });
            }
        }, checkInterval);
        return deferred.promise();
    }

    function updateStatus(retVal) {
        // We expect to get an array that is of hostnames.length back
        // All of them are formatted into strings so just display
        for (var i = 0; i<retVal.length; i++) {
            $(".row .curStatus").eq(i).text(retVal[i]);
            if (retVal[i].indexOf("(Done)") === -1) {
                addMovingDots($(".row .curStatus").eq(i));
            }
        }
        // XXX In the future we can color code and do all that cool stuff
    }

    function finalize() {
        // This function is called when everything is done.
        // Maybe we can remove the installer here?
        // Redirect to first node's index
        $("form:visible .btn.next").val("LAUNCH XD").removeClass('next')
                                                    .addClass("redirect");
        $(".redirect").click(function() {
            if ($(".installationDirectorySection").length !== 0) {
                // tarball installer
                window.location = "https://" + finalStruct.hostnames[0] + ":" + tarballPort;
            } else {
                window.location = "https://" + finalStruct.hostnames[0] + ":" + port;
            }
        });
        $(".ldapSection").hide();
        $(".successSection").show();
        $("form:visible .btn.clear").hide();
    }
    return (Installer);
}({}, jQuery));

$(document).ready(function() {
    Installer.setup();
});
