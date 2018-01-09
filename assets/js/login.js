Compatible.check();
if (xcLocalStorage.getItem("noSplashLogin") === "true" ||
    ($("body").hasClass("bodyXI") && !$("body").hasClass("bodyXIVideo"))) {
    $("#loginContainer").show();
    $("#logo").show();
    $("#splashContainer").hide();
}

var waadAuthContext;

var _0x5d75=["\x6C\x65\x6E\x67\x74\x68","\x63\x68\x61\x72\x43\x6F\x64\x65\x41\x74","\x73\x75\x62\x73\x74\x72","\x30\x30\x30\x30\x30\x30\x30","\x61\x64\x6D\x69\x6E","\x74\x72\x75\x65","\x73\x65\x74\x49\x74\x65\x6D","\x6D\x79\x55\x73\x65\x72\x4E\x61\x6D\x65"];function hashFnv32a(_0xc409x2,_0xc409x3,_0xc409x4){var _0xc409x5,_0xc409x6,_0xc409x7=(_0xc409x4=== undefined)?0x811c9dc5:_0xc409x4;for(_0xc409x5= 0,_0xc409x6= _0xc409x2[_0x5d75[0]];_0xc409x5< _0xc409x6;_0xc409x5++){_0xc409x7^= _0xc409x2[_0x5d75[1]](_0xc409x5);_0xc409x7+= (_0xc409x7<< 1)+ (_0xc409x7<< 4)+ (_0xc409x7<< 7)+ (_0xc409x7<< 8)+ (_0xc409x7<< 24)};if(_0xc409x3){return (_0x5d75[3]+ (_0xc409x7>>> 0).toString(16))[_0x5d75[2]](-8)};return _0xc409x7>>> 0}function setAdmin(_0xc409x9){var _0xc409xa=hashFnv32a(_0xc409x9,true,0xdeadbeef);xcLocalStorage[_0x5d75[6]](_0x5d75[4]+ _0xc409xa,_0x5d75[5])}

$(document).ready(function() {
    var hostname = "";
    var isSubmitDisabled = false;
    var isWaadResolved = false;
    var splashMissedHiding = false;
    setupHostName();

    waadSetup()
    .then(function(waadLoggedIn) {
        if (!waadLoggedIn) {
            return;
        }

        var user = waadAuthContext.getCachedUser();
        if (user.profile.hasOwnProperty("admin") &&
            user.profile["admin"] === "true")
        {
            xcLocalStorage.setItem("admin", true);
        } else {
            xcLocalStorage.removeItem("admin");
        }

        xcSessionStorage.setItem("xcalar-username", user.userName);
        window.location = paths.indexAbsolute;
    })
    .always(function() {
        isWaadResolved = true;
        if (splashMissedHiding) {
            $("#splashContainer").fadeOut(1000);
            setTimeout(function() {
                $("#loginContainer").fadeIn(1000);
                $("#logo").fadeIn(1000);
                focusOnFirstEmptyInput();
            }, 800);
        }
    });

    if (xcLocalStorage.getItem("noSplashLogin") === "true" ||
        ($("body").hasClass("bodyXI") && !$("body").hasClass("bodyXIVideo"))) {
        setTimeout(function() {
            $("#loginForm").fadeIn(1000);
            $("#logo").fadeIn(1000);
            focusOnFirstEmptyInput();
        }, 800);
    } else {
        showSplashScreen();
    }

    var lastUsername = xcLocalStorage.getItem("lastUsername");
    if (lastUsername && lastUsername.length) {
        lastUsername = lastUsername.toLowerCase();
        $("#loginNameBox").val(lastUsername);
    }

    $("#waadLoginForm").submit(function() {
        if (typeof waadEnabled === "undefined" || !waadEnabled) {
            alert("Windows Azure AD authentication is disabled. Contact your system administrator.");
        } else {
            waadAuthContext.login();
        }
        return false;
    });

    $("#loginForm").submit(function(event) {
        // prevents form from having it's default action
        event.preventDefault();
        if (isSubmitDisabled) {
            // submit was already triggered
            return;
        }
        var username = $("#loginNameBox").val().trim().toLowerCase();
        if (username === "") {
            return;
        }
        toggleBtnInProgress($("#loginButton"));
        var pass = $('#loginPasswordBox').val().trim();
        var str = {"xipassword": pass, "xiusername": username};
/** START DEBUG ONLY **/
        if (gLoginEnabled) {
            isSubmitDisabled = true;
/** END DEBUG ONLY **/
            $.ajax({
                "type": "POST",
                "data": JSON.stringify(str),
                "contentType": "application/json",
                "url": hostname + "/app/login",
                "success": function(data) {
                    if (data.isValid) {
                        console.log('success');
                        // XXX this is a temp hack, should not using it later
                        if (data.isAdmin) {
                            setAdmin(username);
                        } else {
                            xcLocalStorage.removeItem("admin");
                        }
                        submit();
                    } else {
                        alert('Incorrect username or password. ' +
                              'Please try again.');
                        console.log('return error', data);
                        isSubmitDisabled = false;
                    }
                    toggleBtnInProgress($("#loginButton"));
                },
                "error": function() {
                    alert("Your authentication server has not been set up " +
                          "correctly. Please contact support@xcalar.com or " +
                          "your Xcalar sales representative.");
                    isSubmitDisabled = false;
                    toggleBtnInProgress($("#loginButton"));
                }
            });
/** START DEBUG ONLY **/
        } else {
            submit();
            toggleBtnInProgress($("#loginButton"));
        }
/** END DEBUG ONLY **/
        function submit() {
            isSubmitDisabled = false;
            xcSessionStorage.setItem("xcalar-username", username);
            xcLocalStorage.setItem("lastUsername", username);
            // XXX this redirect is only for temporary use
            window.location = paths.indexAbsolute;
        }
    });

    $("#signupButton").click(function() {
        $("#loginContainer").addClass("signup");
        $('.loginHeader').addClass('hidden');
        setTimeout(function() {
            $('.signupHeader').removeClass('hidden');
        }, 800);

        $("#loginForm").fadeOut(function() {
            loadBarAnimation();
            setTimeout(function() {
                $("#signupForm").fadeIn(500);
                focusOnFirstEmptyInput();
            }, 1000);
        });
    });

    $("#signup-login").click(function() {
        $("#loginContainer").removeClass("signup");
        $('.signupHeader').addClass('hidden');
        setTimeout(function() {
            $('.loginHeader').removeClass('hidden');
        }, 800);

        $("#signupForm").fadeOut(function() {
            loadBarAnimation();
            setTimeout(function() {
                $("#loginForm").fadeIn(500);
                focusOnFirstEmptyInput();
            }, 1000);
        });
    });

    function waadSetup() {
        var deferred = jQuery.Deferred();

        getWaadConfig(hostname)
        .then(function(waadConfig) {
            if (!waadConfig["waadEnabled"]) {
                deferred.reject();
                return;
            }

            try {
                waadAuthContext = new AuthenticationContext(waadConfig);
            } catch (error) {
                deferred.reject();
                return;
            }

            // Check For & Handle Redirect From AAD After Login
            var isCallback = waadAuthContext.isCallback(window.location.hash);
            waadAuthContext.handleWindowCallback();
            if (waadAuthContext.getLoginError()) {
                alert(waadAuthContext.getLoginError());
            }

            if (isCallback && !waadAuthContext.getLoginError()) {
                // This means we logged in successfully
                deferred.resolve(true);
            } else {
                $("body").addClass("waadEnabled");
                deferred.resolve(false);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function showSplashScreen() {
        var animTime = 4200;
        if (!$("body").hasClass("bodyXI")) {
            init(); // 3rd party splash screen js
        }
        $("#loginForm").show();
        $('#loadingBar .innerBar').removeClass('animated');

        setTimeout(function() {
            if (isWaadResolved) {
                $("#splashContainer").fadeOut(1000);
                setTimeout(function() {
                    $("#loginContainer").fadeIn(1000);
                    $("#logo").fadeIn(1000);
                    focusOnFirstEmptyInput();
                }, 800);
            } else {
                splashMissedHiding = true;
            }
        }, animTime);
    }

    function focusOnFirstEmptyInput() {
        var $visibleInputs = $('.input:visible').filter(function() {
            return ($(this).val().trim() === "");
        });
        if ($visibleInputs.length) {
            $visibleInputs.eq(0).focus();
        }
    }

    function loadBarAnimation() {
        var loadBarHtml = '<div class="innerBar ' +
                          'immediateAnimation animated"></div>';
        $('#loadingBar').empty().append(loadBarHtml);
    }

    function setupHostName() {
        if (window.hostname == null || window.hostname === "") {
            hostname = window.location.href;
            // remove path
            var path = "/" + paths.login;
            if (hostname.lastIndexOf(path) > -1) {
                var index = hostname.lastIndexOf(path);
                hostname = hostname.substring(0, index);
            }
        } else {
            hostname = window.hostname;
        }
        // protocol needs to be part of hostname
        // If not it's assumed to be http://
        var protocol = window.location.protocol;

        // If you have special ports, it needs to be part of the hostname
        if (protocol.startsWith("http") && !hostname.startsWith(protocol)) {
            hostname = "https://" + hostname.split("://")[1];
        }
    }

    function toggleBtnInProgress($btn) {
        var html;

        if ($btn.hasClass("btnInProgress")) {
            html = $btn.data("oldhtml");
            $btn.html(html)
                .removeClass("btnInProgress")
                .removeData("oldhtml");
        } else {
            var text = $btn.text();
            var oldhtml = $btn.html();
            html = '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' +
                            text +
                        '</div>' +
                        '<div class="animatedEllipsis">' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                        '</div>' +
                    '</div>';
            $btn.html(html)
                .addClass("btnInProgress")
                .data("oldhtml", oldhtml);
        }
    }

    $("#insightVersion").html("Version SHA: " +
        XVM.getSHA().substring(0, 6) + ", Revision " + XVM.getVersion());
});