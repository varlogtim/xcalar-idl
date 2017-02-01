Compatible.check();
var hasFlash = flashBlockDetect() === 0;
if (window.isBrowserSafari || window.isBrowserMicrosoft || !hasFlash ||
    xcLocalStorage.getItem("noSplashLogin") === "true") {
    $("#loginContainer").show();
    $("#logo").show();
    $("#splashContainer").hide();
}

$(document).ready(function() {
    var hostname = "";
    setupHostName();

    if (!hasFlash ||
        xcLocalStorage.getItem("noSplashLogin") === "true") {
        setTimeout(function() {
            $("#loginForm").fadeIn(1000);
            $("#logo").fadeIn(1000);
        }, 800);
    } else {
        showSplashScreen();
    }

    $("#loginForm").submit(function(event) {
        // prevents form from having it's default action
        event.preventDefault();
        var username = $("#loginNameBox").val().trim();
        if (username === "") {
            return;
        }

        console.log("username:", username);
        var pass = $('#loginPasswordBox').val().trim();
        var str = {"xipassword": pass, "xiusername": username};

        if (gLoginEnabled) {
            $.ajax({
                "type"       : "POST",
                "data"       : JSON.stringify(str),
                "contentType": "application/json",
                "url"        : hostname + "/app/login",
                "success"    : function(data) {
                    ret = data;
                    if (ret.status === Status.Ok) {
                        console.log('success');
                        // XXX this is a temp hack, should not using it later
                        if (data.isAdmin) {
                            xcLocalStorage.setItem("admin", true);
                        } else {
                            xcLocalStorage.removeItem("admin");
                        }
                        submit();
                    } else if (ret.status === Status.Error) {
                        alert('Incorrect Password. Please try again.');
                        console.log('return error', data, ret);
                    } else {
                        //Auth server probably down or something. Just let them in
                        console.log('shouldnt be here', data, ret);
                        submit();
                    }

                },
                "error": function(error) {
                    //Auth server probably down or something. Just let them in
                    console.log(error);
                    submit();
                }
            });

        } else {
            submit();
        }

        function submit() {
            var fullUsername = username;
            var index = username.indexOf("/");
            if (index > 0) {
                username = username.substring(0, index);
            }

            var atIndex = username.indexOf("@");
            if (atIndex > 0) {
                username = username.substring(0, atIndex);
            }

            xcSessionStorage.setItem("xcalar-username", username);
            xcSessionStorage.setItem("xcalar-fullUsername", fullUsername);
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

    function showSplashScreen() {
        $("#loginForm").show();
        $('#loadingBar .innerBar').removeClass('animated');

        setTimeout(function() {
            $("#splashContainer").fadeOut(1000);
        }, 5800);
       
        setTimeout(function() {
            $("#loginContainer").fadeIn(1000);
            $("#logo").fadeIn(1000);
        }, 6600);
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
            if (hostname.endsWith(path)) {
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
        if (!hostname.startsWith(protocol)) {
            hostname = "https://" + hostname;
        }
    }

    $("#insightVersion").html("Version SHA: " +
        XVM.getSHA().substring(0, 6) + ", Revision " + XVM.getVersion());
});

function flashBlockDetect(callbackMethod){
    var return_value = 0;

    if (navigator.plugins["Shockwave Flash"]) {
        embed_length = $('embed').length;
        object_length = $('object').length;

        if((embed_length > 0) || (object_length > 0)) {
            // Mac / Chrome using FlashBlock + Mac / Safari using AdBlock
            $('object, embed').each(function() {
                        if($(this).css('display') === 'none'){
                                return_value = 2;
                        }
            });
        } else {
            // Mac / Firefox using FlashBlock 
            if( $('div[bginactive]').length > 0 ){
                        return_value = 2;
            }
        }
    } else if (navigator.userAgent.indexOf('MSIE') > -1) {
        try {
            new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
        } catch(e) {
            return_value = 2;
        }
    } else {
        // If flash is not installed
        return_value = 1;
    }

    if(callbackMethod && typeof(callbackMethod) === "function") {
        callbackMethod(return_value);
    } else {
        return return_value;
    }
}
