window.Installer = (function(Installer, $) {

    var finalStruct = {
        "nfsOption"  : undefined, // Either empty struct (use ours) or
        //         { "nfsServer": "netstore.int.xcalar.com",
        //           "nfsMountPoint": "/public/netstore",
        //           "nfsUsername": "jyang",
        //           "nfsGroup": "xcalarEmployee" }
        "hostnames"  : [],
        "username"   : "",
        "port"       : 22,
        "credentials": {} // Either password or sshKey
    };

    function ApiStruct(api, struct) {
        this.api = api;
        this.struct = struct;
        return this;
    }

    var Api = {
        "runPrecheck"         : 0,
        "checkStatus"         : 1,
        "runInstaller"        : 2,
        "completeInstallation": 3,
        "checkLicense"        : 4,
        "cancelInstall"       : 5,
    };

    var Status = {
        "Ok"     : 0,
        "Done"   : 1,
        "Running": 2,
        "Error"  : -1,
    };

    var intervalTimer;
    var statusApi;
    var checkInterval = 2000; // How often to check for status

    var $forms = $("form");
    var lastStep = 2; // Last step of form
    var numServers = 4;
    var cancel = false;
    Installer.clearInterval = function() {
        if (intervalTimer) {
            clearInterval(intervalTimer);
        }
    };

    Installer.setup = function() {
        // Set up submit buttons and back buttons for all screens
        $("input.next").click(function() {
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

        $("input.back").click(function() {
            var curFormId = $(this).closest("form").attr("id");
            var curStepId = findStepId(curFormId);

            Installer.showStep(curStepId - 1);
        });

        $("input.clear").click(function() {
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
        setUpStep0();
        setUpStep1();
        setUpStep2();

        // Set up ajax error handlers to catch server side issues
        /**
        jQuery.ajaxSetup({
            error: function() {
                debugger;
            },
            complete: function() {
                debugger;
            },
            success: function() {
                debugger;
            },
            dataFilter: function() {
                debugger;
            },
            abort: function() {
                debugger;
            },
            statusCode: function() {
                debugger;
            }
        }); */

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
            case ("nfsOption"):
                $(".customerNfsOptions").hide();
                switch (radioOption) {
                    case ("xcalarNfs"):
                        break;
                    case ("customerNfs"):
                        $(".customerNfsOptions").show();
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
            default:
                console.error("Unexpected radio group!");
                break;
        }
    }

    function sendViaHttps(arrayToSend, successCB, failureCB) {
        try {
            jQuery.ajax({
                method     : "POST",
                // url        : "http://cantor.int.xcalar.com:12124",
                // url        : document.location.href+"install",
                url        : "http://cantor.int.xcalar.com:8080/install",
                data       : JSON.stringify(arrayToSend),
                contentType: "application/json",
                success    : successCB,
                error      : failureCB
            });
        } catch (e) {
            // XXX Handle the different statuses and display relevant
            // error messages
        }
    }

    function setUpStep0() {
        $(".licenseKey").focus();
    }

    function setUpStep1() {
    }

    function setUpStep2() {
        $("#numServers").on("keyup", function(e) {
            var keyCode = e.which;
            if (keyCode === 13) {
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
                $(".title").removeClass("hidden");
                $("#installButton").removeClass("hidden");
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
                $(".invalidLicense").hide();
                return validateKey();
            case (1):
                return validateNfs();
            case (2):
                return validateCredentials();
            default:
                console.error("Unexpected step");
                break;
        }
    }

    function validateKey() {
        var deferred = jQuery.Deferred();
        var finalKey = $(".licenseKey").val();

        verifyKey(finalKey)
        .then(function(retStruct) {
            if (retStruct.verified) {
                deferred.resolve();
            } else {
                deferred.reject("Invalid license key", "The license key that " +
                                "you have entered is not valid. Please check " +
                                "the key and try again");
            }
        })
        .fail(function() {
            console.error("Connection Error");
            deferred.reject("Connection Error", "Connection with the " +
                            "authentication server cannot be established.");
        });
        return (deferred.promise());
    }

    function validateNfs() {
        var deferred = jQuery.Deferred();
        var nfsOption = $(".nfsOption.radioButton.active").data("option");
        if (nfsOption === "xcalarNfs") {
            finalStruct.nfsOption = {};
            deferred.resolve();
        } else {
            if ($("#nfsServer").html().trim().length === 0) {
                deferred.reject("NFS Server Invalid",
                              "You must provide a valid NFS Server IP or FQDN");
            } else {
                finalStruct.nfsOption = {};
                finalStruct.nfsOption.nfsServer = $("#nfsServer").html().trim();
                finalStruct.nfsOption.nfsMountPoint = "/" + $("#nfsMountPoint")
                                                                 .html().trim();
                finalStruct.nfsOption.nfsUsername = $("#nfsUserName").val()
                                                                     .trim();
                finalStruct.nfsOption.nfsGroup = $("#nfsUserGroup").val()
                                                                   .trim();
                deferred.resolve();
            }
        }
        return deferred.promise();
    }

    function validateCredentials() {
        var deferred = jQuery.Deferred();
        var $hostInputs = $(".hostUsername input:visible");
        var i;
        for (i = 0; i<$hostInputs.length; i++) {
            if ($hostInputs.eq(i).val().trim().length === 0) {
                deferred.reject("Empty Username / Port",
                                "Your SSH username / port cannot be empty.");
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
            } else {
                finalStruct.credentials = {};
                finalStruct.credentials.password = $(".hostPassword input")
                                                                         .val();
            }
        } else if (passOption === "sshKey") {
            if ($(".hostSshKey textarea").val().trim().length === 0) {
                deferred.reject("Empty Ssh Key",
                          "Your ssh key is generally located at ~/.ssh/id_rsa");
            } else {
                finalStruct.credentials = {};
                finalStruct.credentials.sshKey = $(".hostSshKey textarea").val()
                                                                        .trim();
            }
        } else {
            deferred.reject("Illegal Password Option",
                            "Not a legal password option");
        }

        var hostArray = $(".row .hostname input");
        var allHosts = [];
        for (i = 0; i<hostArray.length; i++) {
            var nameOrIP = hostArray.eq(i).val().trim();
            if (nameOrIP.length > 0) {
                allHosts.push(nameOrIP);
            }
        }

        if (allHosts.length === 0) {
            deferred.reject("No hosts","You must install on at least 1 host");
        }

        // Find dups
        for (i = 0; i<allHosts.length; i++) {
            if (allHosts.indexOf(allHosts[i], i+1) > -1) {
                deferred.reject("Duplicate Hosts",
                                "Hostname " + allHosts[i] + " is a duplicate");
            }
        }

        finalStruct.hostnames = allHosts;
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
                executeFinalArray()
                .fail(function() {
                    showFailure(curStepId, arguments);
                });
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
        $error = $(".error").eq(curStepId);
        $error.find("span").eq(0).html(args[0]+"<br>");
        $error.find("span").eq(1).html(args[1]);
        $error.show();
    }

    function hostnameHtml(id) {
        return ('<div class="row">' +
            '<div class="leftCol hostname">' +
              '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
              'value="" ' +
              'name="useless" placeholder="[IP or FQDN]">' +
              '<div class="bar">Host '+id+'.</div>' +
            '</div>' +
            '<div class="rightCol status">' +
              '<span class="curStatus">' +
                '----' +
              '</span>' +
            '</div>' +
        '</div>');
    }

    function verifyKey(key) {
        var deferred = jQuery.Deferred();
        // Make async call here

        checkLicense(key)
        .then(function(ret) {
            if (ret === Status.Ok) {
                deferred.resolve({"verified": true});
            } else {
                deferred.resolve({"verified": false});
            }
        })
        .fail(function() {
            deferred.reject();
        });
        return deferred.promise();
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
        $("#numServers").prop("disabled", "true");
        // Remove all empty hostnames from screen. This happens when they don't
        // use all the licenses they bought
        var hostnames = $(".row:not(.header)");
        for (var i = 0; i<hostnames.length; i++) {
            if (hostnames.eq(i).find("input").val().trim().length === 0) {
                hostnames.eq(i).hide();
            }
        }

        $("#installButton").val("INSTALLING...")
                           .addClass("inactive");
        $(".row .curStatus").text("Installing...");
        $("input.back").hide();
        $("input.cancel").removeClass("hidden");
        sendCommand(Api.runInstaller)
        .then(function() {
            return (getStatus(Api.checkStatus));
        })
        .then(function() {
            // This function redirects and does not return.
            finalize();
        })
        .fail(function() {
            $(".credentialSection").show();
            $(".credentialSection").prev().show();
            $(".row:not(.header)").show();
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

    function checkLicense(license) {
        var deferred = jQuery.Deferred();
        var struct = new ApiStruct(Api.checkLicense, {"licenseKey": license});
        sendViaHttps(struct, function(ret) {
            if (ret.status === Status.Ok) {
                deferred.resolve(Status.Ok);
            } else {
                deferred.resolve(Status.Error);
            }
        }, function(ret, textStatus, xhr) {
            console.error(arguments);
            deferred.reject();
        });
        return deferred.promise();
    }

    function sendCommand(api) {
        var deferred = jQuery.Deferred();
        var struct = new ApiStruct(api, finalStruct);
        sendViaHttps(struct, function(ret) {
            if (ret.status === Status.Ok) {
                deferred.resolve();
            } else {
                deferred.reject(ret);
            }
        }, function(ret, textStatus, xhr) {
            console.error(arguments);
            deferred.reject("Connection Error",
                            "Connection to server cannot be established. " +
                            "Please contact Xcalar Support.");
        });
        return deferred.promise();
    }

    function getStatus(api) {
        var deferred = jQuery.Deferred();

        if (intervalTimer) {
            clearInterval(intervalTimer);
        }
        statusApi = api;

        intervalTimer = setInterval(function() {
            var struct;
            if (cancel) {
                /**
                // Handle not being able to cancel
                struct = new ApiStruct(Api.cancelInstall, finalStruct);
                sendViaHttps(struct, function(ret) {
                    if (ret.status === Status.Ok) {
                        deferred.resolve();
                    } else {
                        deferred.reject(ret);
                    }
                }, function(ret, textStatus, xhr) {
                    console.error(arguments);
                    deferred.reject("Connection Error",
                                    "Connection to server cannot be " +
                                    "established. " +
                                    "Please contact Xcalar Support.");
                });
                */
                deferred.reject("Cancelled", "Installation cancelled");
                cancel = false;
                $("input.cancel").val("CANCEL");
                clearInterval(intervalTimer);

            } else {
                struct = new ApiStruct(statusApi, finalStruct);
                sendViaHttps(struct, function(ret) {
                    console.log(ret);
                    if (ret.status === Status.Done) {
                        clearInterval(intervalTimer);
                        deferred.resolve();
                    } else if (ret.status === Status.Error) {
                        clearInterval(intervalTimer);
                        deferred.reject("Status Error",
                                        JSON.stringify(ret.retVal));
                    }
                    updateStatus(ret.retVal);
                }, function(ret, textStatus, xhr) {
                    clearInterval(intervalTimer);
                    console.error(arguments);

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
        window.location = "http://" + finalStruct.hostnames[0];
    }

    return (Installer);
}({}, jQuery));


$(document).ready(function() {
    Installer.setup();
});











