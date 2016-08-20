var numServers = 4;

window.Installer = (function(Installer, $) {

    var finalStruct = {
        "nfsOption": undefined, // Either empty struct (use ours) or 
        //         { "nfsServer": "netstore.int.xcalar.com",
        //           "nfsMountPoint": "/public/netstore",
        //           "nfsUsername": "jyang",
        //           "nfsGroup": "xcalarEmployee" }

    };
    var $forms = $("form");

    Installer.setup = function() {
        // Set up submit buttons and back buttons for all screens
        $("input.next").click(function() {
            var curFormId = $(this).closest("form").attr("id");
            var curStepId = findStepId(curFormId);

            validateCurrentStep(curStepId)
            .then(function(ret) {
                setupNextStep(curStepId, ret);
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

        $("input.submit").click(function() {
            console.log("Submit!");
        });

        // Set up listeners for radioButtons
        $(".radioButton").click(function() {
            // If option is the same as before, ignore and return
            if ($(this).hasClass("active")) {
                console.log("same");
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

    };

    Installer.showStep = function(stepNum) {
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
            switch(radioOption) {
            case ("xcalarNfs"):
                break;
            case ("customerNfs"):
                $(".customerNfsOptions").show();
                break;
            default:
                console.error("Unexpected option!");
            }
            break;
        case ("passOption"):
            $(".hostSshKey").hide();
            $(".hostPassword").hide();
            switch(radioOption) {
            case ("password"):
                $(".hostPassword").show();
                break;
            case ("sshKey"):
                $(".hostSshKey").show();
                break;
            default:
                console.error("Unexpected option!");
            }
            break;
        default:
            console.error("Unexpected radio group!");
        }
    }

    function setUpStep0() {
        $("input.licenseKey").on("keyup", function(e) {
            var keyCode = e.which;
            if (keyCode === 8) {
                // Backspace
                if ($(this).val().length === 0) {
                    $(this).prev().prev(".licenseKey").focus();
                }
            } else {
                if ($(this).val().length === 4) {
                    // At max length, focus on next field
                    $(this).next().next(".licenseKey").focus();
                }
            }
        });
    }

    function setUpStep1() {

    }

    function setUpStep2() {

    }

    function validateCurrentStep(stepId) {
        switch(stepId) {
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
        var keyArray = $(".licenseKey");
        var finalKey = "";
        for (var i = 0; i<keyArray.length; i++) {
            finalKey += keyArray.eq(i).val();
        }

        verifyKey(finalKey)
        .then(function(retStruct) {
            if (!retStruct) {
                console.error("Connection Error");
                deferred.reject("Connection Error", "Connection with the " +
                                "authentication server cannot be established.");
            }
            if (retStruct.verified) {
                deferred.resolve(retStruct.numServers);
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
                finalStruct.nfsOption.nfsMountPoint = $("#nfsMountPoint").html()
                                                                        .trim();
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

    }

    function setupNextStep(curStepId, ret) {
        switch (curStepId) {
        case (0):
            // ret is the number of servers that we can install on
            var html = "";
            for (var i = 0; i<ret; i++) {
                html += hostnameHtml(i+1);
            }
            $(".row.header").after(html);
            break;
        case (1):
        case (2):
            return;
        default:
            return;
        }
    }

    function showFailure(curStepId, args) {
        switch(curStepId) {
        case(0):
            $(".invalidLicense").find("span").eq(0).html(args[0]+"<br>");
            $(".invalidLicense").find("span").eq(1).html(args[1]);
            $(".invalidLicense").show();
        }
    }

    function hostnameHtml(id) {
        return ('<div class="row">' +
            '<div class="leftCol hostname">' +
              '<input class="input" type="text" autocomplete="off" value="" placeholder="[IP or FQDN]">' +
              '<div class="bar">Host '+id+'.</div>' +
            '</div>' +
            '<div class="rightCol status">' +
              '<span class="curStatus">' +
                'Lollipop icing chocolate cake tart gingerbread carrot cake.' +
              '</span>' +
            '</div>' +
        '</div>');
    }

    function verifyKey(key) {
        var deferred = jQuery.Deferred();
        // Make async call here

        // we fake da shit for now
        if (key === "1234123412341234") {
            deferred.resolve({"verified": true,
                              "numServers": numServers});
        } else {
            deferred.resolve({"verified": false});
        }
        return deferred.promise();
    }

    return (Installer);
}({}, jQuery));


$(document).ready(function() {
    Installer.setup();
});











