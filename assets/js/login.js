$(document).ready(function() {
    // localStorage.setItem("xc-login", true);
    // $("#loginContainer").fadeIn(2000);
    // $("#loginNameBox").focus();
    // $("#insightVersion").fadeIn(2000);
    setTimeout(function() {
        $('#loginForm').fadeIn(1000);
    }, 800);

    $("#loginForm").submit(function(event) {
        // prevents form from having it's default action
        event.preventDefault();
        var username = $("#loginNameBox").val();
        var fullUsername = username;
        if (username === "") {
            return;
        }

        var index = username.indexOf("/");
        if (index > 0) {
            username = username.substring(0, index);
        }

        console.log("username:", username);
        var pass = $('#loginPasswordBox').val();
        var str = {"xipassword": pass, "xiusername": username};

        var loginEnabled = false;
        if (loginEnabled) {
            $.ajax({
                type: 'POST',
                data: JSON.stringify(str),
                contentType: 'application/json',
                url: "https://authentication.xcalar.net/app/login",
                success: function(data) {
                    ret = data;
                    if (ret.status === Status.Ok) {
                        console.log('success');
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
                error: function(data) {
                    //Auth server probably down or something. Just let them in
                    console.error(error);
                    submit();
                }
            });

        } else {
            submit();
        }

        function submit() {
            sessionStorage.setItem("xcalar-username", username);
            sessionStorage.setItem("xcalar-fullUsername", fullUsername);
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

    function focusOnFirstEmptyInput() {
        var $visibleInputs = $('.input:visible').filter(function() {
            return ($(this).val().trim() === "");
        });
        if ($visibleInputs.length) {
            $visibleInputs.eq(0).focus();
        }
    }

    function loadBarAnimation() {
        var loadBarHtml = '<div class="innerBar immediateAnimation"></div>';
        $('#loadingBar').empty().append(loadBarHtml);
    }

    $("#insightVersion").html("Version SHA: " +
        XVM.getSHA().substring(0, 6) + ", Revision " + XVM.getVersion());
});