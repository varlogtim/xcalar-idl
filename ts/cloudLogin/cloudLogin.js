// var cookieAuthFlag = true;

var userPoolId = "us-west-2_Eg94nXgA5";
var clientId = "69vk7brpkgcii8noqqsuv2dvbt";
var identityPoolId = "us-west-2:7afc1673-6fe1-4943-a913-e43f2715131d";

var poolData = {
    UserPoolId: userPoolId,
    ClientId: clientId
};
var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
var locaUsername;
var localPassword;
var localSessionId;
var cognitoUser;

// START NO COOKIE AUTH

// TODO: REMOVE THIS WHOLE NO COOKIE AUTH PART ONCE COOKIE AUTH IS FULLY WORKING

// if (!cookieAuthFlag) {
//     function decodeJwt(token) {
//         try {
//             const base64Url = token.split('.')[1];
//             const base64 = base64Url.replace('-', '+').replace('_', '/');
//             const decodedJwt = JSON.parse(window.atob(base64));
//             return decodedJwt;
//         } catch (error) {
//             console.error(error);
//             handleException();
//         }
//     }

//     function getExpiryTime(tokens) {
//         var idToken = tokens["idToken"]
//         if (typeof idToken === "string") {
//             return decodeJwt(idToken)["exp"]
//         } else {
//             return idToken["payload"]["exp"]
//         }
//     }

//     var localTokens = xcLocalStorage.getItem("xcalarTokens");

//     // console.log('localTokens');
//     // console.log(localTokens);

//     if (localTokens && localTokens !== "undefined") {
//         getCredentials(JSON.parse(localTokens))
//     } else {
//         showInitialScreens()
//     }

//     async function updateTokens(oldTokens) {
//         let newTokens = oldTokens;
//         return fetch("https://cognito-idp.us-west-2.amazonaws.com/", {
//                 headers: {
//                     "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
//                     "Content-Type": "application/x-amz-json-1.1",
//                 },
//                 mode: 'cors',
//                 cache: 'no-cache',
//                 method: 'POST',
//                 body: JSON.stringify({
//                     ClientId: clientId,
//                     AuthFlow: 'REFRESH_TOKEN_AUTH',
//                     AuthParameters: {
//                         REFRESH_TOKEN: oldTokens["refreshToken"]["token"],
//                     }
//                 }),
//             })
//             .then(res => res.json())
//             .then(result => {
//                 newTokens["idToken"] = result.AuthenticationResult.IdToken;
//                 newTokens["accessToken"] = result.AuthenticationResult.AccessToken;
//                 xcLocalStorage.setItem("xcalarTokens", JSON.stringify(newTokens));
//                 return newTokens;
//             })
//             .catch(error => {
//                 console.error('updateTokens error:', error);
//                 handleException();
//             });
//     }

//     async function getCredentials(tokens) {
//         var expiryTime = getExpiryTime(tokens);
//         if (Date.now() / 1000 >= expiryTime) {
//             // if (true) {
//             tokens = await updateTokens(tokens);
//         }
//         var loginApiUrl = "cognito-idp.us-west-2.amazonaws.com/" + userPoolId;

//         try {
//             AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//                 IdentityPoolId: identityPoolId,
//                 Logins: {
//                     [loginApiUrl]: tokens["idToken"]["jwtToken"]
//                 }
//             }, {
//                 region: 'us-west-2'
//             });
//             AWS.config.credentials.get(function (err) {
//                 if (err) {
//                     console.error('AWS.config.credentials.get error: ', err);
//                     handleException();
//                 } else {
//                     var accessKeyId = AWS.config.credentials.accessKeyId;
//                     var secretAccessKey = AWS.config.credentials.secretAccessKey;
//                     var sessionToken = AWS.config.credentials.sessionToken;

//                     username = xcLocalStorage.getItem("xcalarUsername");
//                     clusterSelection();
//                 }
//             });
//         } catch (error) {
//             console.error('AWS.config.credentials error: ', error);
//         }
//     }

//     function cognitoUserLogin(cognitoUser, authenticationDetails) {
//         cognitoUser.authenticateUser(authenticationDetails, {
//             onSuccess: function () {
//                 $("#loginFormError").hide();
//                 cognitoUser = userPool.getCurrentUser();
//                 if (cognitoUser != null) {
//                     cognitoUser.getSession(function (err, tokens) {
//                         if (tokens && tokens !== "undefined") {
//                             xcLocalStorage.setItem("xcalarTokens", JSON.stringify(tokens));
//                             getCredentials(tokens);
//                         }
//                     });
//                 }
//             },
//             onFailure: function (err) {
//                 if (err.code === "UserNotConfirmedException") {
//                     $("#loginFormError").hide();
//                     $("header").children().hide();
//                     $("#formArea").children().hide();
//                     $("#verifyForm").show();
//                     $("#verifyTitle").show();
//                 } else {
//                     showFormError($("#loginFormError"), "Wrong email or password. Please try again.");
//                     console.error(err);
//                 }
//             },
//         });
//     }

//     function noCookieLogin(username, password) {
//         var authenticationData = {
//             Username: username,
//             Password: password,
//         };
//         var userData = {
//             Username: username,
//             Pool: userPool
//         };

//         var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
//         cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
//         xcLocalStorage.setItem("xcalarUsername", username);
//         cognitoUserLogin(cognitoUser, authenticationDetails);

//     }

//     function noCookieLogout() {
//         xcLocalStorage.setItem("xcalarTokens", "");
//     }

//     // END NO COOKIE AUTH
// } else {
// START COOKIE AUTH

// TODO: ALWAYS USE IT ONCE COOKIE PART IS FULLY READY


var cookieAuthApiUrl = "https://1jqb965i1d.execute-api.us-west-2.amazonaws.com";

fetch(cookieAuthApiUrl + "/prod/status", {
        credentials: 'include',
    })
    .then(res => res.json())
    .then(response => {
        if (response.loggedIn === true) {
            localUsername = response.emailAddress;
            // XXX TODO: remove it after prod/status can return id
            localSessionId = xcLocalStorage.getItem("xcalarSessionId");
            clusterSelection();
        } else if (response.loggedIn === false) {
            showInitialScreens();
            // XXX TODO: remove it after prod/status can return id
            localSessionId = "";
            xcLocalStorage.removeItem("xcalarSessionId");
        } else {
            console.error('cookieLoggedInStatus unrecognized code:', response);
        }
    }).catch(error => {
        console.error('cookieLoggedInStatus error:', error);
        handleException();
    });

function cookieLogin(username, password) {
    var $button = $("#loginButton");
    $button.addClass("xc-disabled");

    fetch(cookieAuthApiUrl + "/prod/login", {
        headers: {
            "Content-Type": "application/json",
        },
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
            "username": username,
            "password": password
        }),
    }).then((response) => {
        if (response.status === 200) {
            $("#loginFormError").hide();
            return response.json();
        } else if (response.status === 401) {
            // unauthorized
            return Promise.reject("Wrong email or password.");

            // TODO: ONCE /login RETURNS A CODE/STATUS FOR THIS CASE

            // } else if (response.code === "UserNotConfirmedException") {
            //     // correct email/password but email not confirmed
            //     $("#loginFormError").hide();
            //     $("header").children().hide();
            //     $("#formArea").children().hide();
            //     $("#verifyForm").show();
            //     $("#verifyTitle").show();
        } else {
            // unrecognized code
            return Promise.reject();
        }
    })
    .then((res) => {
        localUsername = username;
        localSessionId = res.sessionId;
        // XXX TODO: remove it after prod/status can return id
        xcLocalStorage.setItem("xcalarSessionId", localSessionId);
        $button.removeClass("xc-disabled");

        $button.addClass("xc-disabled");
        var cb = () => $button.removeClass("xc-disabled");
        clusterSelection(cb);
    })
    .catch((error) => {
        console.error('cookieLogin error:', error);
        if (typeof error !== "string") {
            error = "Login failed with unknown error.";
        }
        error += " Please try again.";
        showFormError($("#loginFormError"), error);
        $button.removeClass("xc-disabled");
    });
}

function cookieLogout() {
    fetch(cookieAuthApiUrl + "/prod/logout", {
            credentials: 'include',
        })
        .then(response => {
            if (response.status === 200) {
                // XXX TODO: remove it after prod/status can return id
                localSessionId = "";
                xcLocalStorage.removeItem("xcalarSessionId");
            } else if (response.status === 500) {
                console.error('error logging out:', response);
                handleException();
            } else {
                console.error('cookieLogout unrecognized code:', response);
                handleException();
            }
        }).catch(error => {
            console.error('cookieLogut error:', error);
            handleException();
        });
}

// }

// END COOKIE AUTH

// function userLogin(username, password) {
//     localUsername = username;
//     if (cookieAuthFlag) {
//         cookieLogin(username, password);
//     } else {
//         noCookieLogin(username, password)
//     }
// }

// function userLogout() {
//     if (cookieAuthFlag) {
//         cookieLogout();
//     } else {
//         noCookieLogout();
//     }
// }

function checkCredit() {
    return new Promise((resolve, reject) => {
        fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/get", {
            headers: {
                "Content-Type": "application/json",
            },
            method: 'POST',
            body: JSON.stringify({
                "username": localUsername
            }),
        })
        .then(res => res.json())
        .then((billingGetResponse) => {
            // console.log(billingGetResponse.credits);
            if (billingGetResponse.credits > 0) {
                resolve(true);
            } else {
                $("header").children().hide()
                $("#formArea").children().hide()
                $('#noCreditsForm').show();
                $('#noCreditsTitle').show(); 
                resolve(false);
            }
        })
        .catch((error) => {
            console.error('checkCredit error caught:', error);
            handleException();
            reject(error);
        });
    });
}

function getCluster() {
    return fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/get", {
        headers: {
            "Content-Type": "application/json",
        },
        method: 'POST',
        body: JSON.stringify({
            "username": localUsername
        }),
    })
    .then(res => res.json())
    .then((clusterGetResponse) => {
        if (clusterGetResponse.status !== 0) {
            // error
            console.error('getCluster error. cluster/get returned: ', clusterGetResponse);
            // XXX TODO: remove this hack fix when lambda fix it
            if (clusterGetResponse.status === 8 &&
                clusterGetResponse.error === "Cluster is not reachable yet"
            ) {
                setTimeout(() => getCluster(), 3000);
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#loadingTitle").show();
                $("#loadingForm").show();
                deployingClusterAnimation();
                return;
            }
            handleException();
        } else if (clusterGetResponse.isPending === false && clusterGetResponse.clusterUrl === undefined) {
            // go to cluster selection screen
            $("header").children().hide();
            $("#formArea").children().hide();
            $("#clusterTitle").show();
            $("#clusterForm").show();
        } else if (clusterGetResponse.isPending) {
            // go to wait screen
            setTimeout(() => getCluster(), 3000);
            $("header").children().hide();
            $("#formArea").children().hide();
            $("#loadingTitle").show();
            $("#loadingForm").show();
            deployingClusterAnimation();
        } else {
            // redirect to cluster
            if (progressBar.isStarted()) {
                showClusterIsReadyScreen();
                setTimeout(() => goToXcalar(clusterGetResponse), 2000);
            } else {
                goToXcalar(clusterGetResponse);
            }
        }
    })
    .catch((error) => {
        console.error('getCluster error caught:', error);
        handleException();
    });
}

function clusterSelection(cb) {
    checkCredit()
    .then((hasCredit) => {
        if (hasCredit) {
            return getCluster();
        }
    })
    .finally(() => {
        if (typeof cb === "function") {
            cb();
        }
    });
}

function goToXcalar(clusterGetResponse) {
    var sessionId = localSessionId;
    if (!sessionId || !clusterGetResponse.clusterUrl) {
        alert("Fail to redirect to xcalar cluster, please concat Xcalar Support.");
        return;
    }
    var url = clusterGetResponse.clusterUrl + "/" + paths.login +
    "?cloudId=" + encodeURIComponent(sessionId);
    // if (locaUsername) {
    //     url += "&cloudName=" + locaUsername; // XXX TODO: remove this hack part
    // }
    window.location.href = url;
}

function showInitialScreens() {
    $("header").children().hide()
    $("#formArea").children().hide()
    var signupScreen = new URLSearchParams(window.location.search).has("signup");
    if (signupScreen) {
        $("#signupTitle").show();
        $("#signupForm").show();
    } else {
        $("#loginTitle").show();
        $("#loginForm").show();
    }
}

function handleException() {
    // XXX TODO: show a better screen
    alert("Server Error, failed to process request!");
    showInitialScreens();
}

function checkLoginForm() {
    var email = document.getElementById("loginNameBox").value;
    var password = document.getElementById("loginPasswordBox").value;
    if (!email || !password) {
        showFormError($("#loginFormError"), "Fields missing or incomplete.");
        return false;
    } else if (!validateEmail(email) || !validatePassword(password)) {
        showFormError($("#loginFormError"), "Incorrect email address or password.");
        return false;
    } else {
        $("#loginFormError").hide();
        return true;
    }
}

function showFormError($errorBox, errorText) {
    $errorBox.children(".text").html(errorText);
    $errorBox.show();
}

function validateEmail(email) {
    return email.match(/\S+@\S+\.\S+/);
}

function validatePassword(password) {
    return password.match(/(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/)
}

var signupSubmitClicked = false;
var focusTooltipShown = false

function hideTooltip($element) {
    if (!focusTooltipShown) {
        $element.find(".input-tooltip").hide();
    }
}

function showTooltip($element) {
    if (!focusTooltipShown) {
        $element.find(".input-tooltip").show();
    }
}

function showInputError($element, condition) {
    if (condition) {
        $element.find('.icon.xi-error').hide();
        $element.find('.input-tooltip').hide();
        $element.hover(
            function () {
                hideTooltip($(this))
            },
            function () {
                hideTooltip($(this))
            }
        );
    } else {
        $element.find('.icon.xi-error').css('display', 'inline-block');
        $element.focusin(
            function () {
                $(this).find(".input-tooltip").show();
                focusTooltipShown = true;
            }
        )
        $element.focusout(
            function () {
                $(this).find(".input-tooltip").hide();
                focusTooltipShown = false;
            }
        )
        $element.hover(
            function () {
                showTooltip($(this))
            },
            function () {
                hideTooltip($(this))
            }
        );
    }
}

function showPasswordErrorRows(password) {
    var lowerCaseLetters = /[a-z]/g;
    if (password.match(lowerCaseLetters)) {
        $("#passwordLowerTooltipError").removeClass("errorTooltipRow");
    } else {
        $("#passwordLowerTooltipError").addClass("errorTooltipRow");
    }

    // Validate capital letters
    var upperCaseLetters = /[A-Z]/g;
    if (password.match(upperCaseLetters)) {
        $("#passwordUpperTooltipError").removeClass("errorTooltipRow");
    } else {
        $("#passwordUpperTooltipError").addClass("errorTooltipRow");
    }

    // Validate numbers
    var numbers = /[0-9]/g;
    if (password.match(numbers)) {
        $("#passwordNumberTooltipError").removeClass("errorTooltipRow");
    } else {
        $("#passwordNumberTooltipError").addClass("errorTooltipRow");
    }

    // Validate length
    if (password.length >= 8) {
        $("#passwordLengthTooltipError").removeClass("errorTooltipRow");
    } else {
        $("#passwordLengthTooltipError").addClass("errorTooltipRow");
    }

    // Validate special characters
    var specialCharacters = /\W/g;
    if (password.match(specialCharacters)) {
        $("#passwordSpecialTooltipError").removeClass("errorTooltipRow");
    } else {
        $("#passwordSpecialTooltipError").addClass("errorTooltipRow");
    }
}

function checkSignUpForm() {
    var checkedEULA = $("#signup-termCheck").prop('checked');
    var email1 = $("#signup-email").val();
    var email2 = $("#signup-confirmEmail").val();
    var password1 = $("#signup-password").val();
    var password2 = $("#signup-confirmPassword").val();
    var emailsMatch = email1 === email2;
    var passwordsMatch = password1 === password2;

    if (signupSubmitClicked) {
        showInputError($("#firstNameSection"), $("#signup-firstName").val());
        showInputError($("#lastNameSection"), $("#signup-lastName").val());
        showInputError($("#companySection"), $("#signup-company").val());
        showInputError($("#emailSection"), validateEmail(email1));
        showInputError($("#confirmEmailSection"), emailsMatch && validateEmail(email1));
        showInputError($("#passwordSection"), validatePassword(password1));
        showInputError($("#confirmPasswordSection"), passwordsMatch && validatePassword(password1));
        showInputError($(".submitSection"), checkedEULA);
    }

    showPasswordErrorRows(password1)

    $(".tooltipRow i").removeClass("xi-cancel")
    $(".tooltipRow i").addClass("xi-success")
    $(".errorTooltipRow i").removeClass("xi-success")
    $(".errorTooltipRow i").addClass("xi-cancel")

    var inputIsCorrect = $("#signup-firstName").val() &&
        $("#signup-lastName").val() &&
        $("#signup-company").val() &&
        validateEmail(email1) &&
        emailsMatch &&
        validatePassword(password1) &&
        passwordsMatch &&
        checkedEULA;

    if (inputIsCorrect) {
        $("#signupFormError").hide()
        return true;
    } else {
        if (signupSubmitClicked) {
            showFormError($("#signupFormError"), "Fields missing or incomplete.");
        }
        return false;
    }
}

$("#passwordSection").focusin(
    function () {
        $(this).find(".input-tooltip").show();
    }
)
$("#passwordSection").focusout(
    function () {
        $(this).find(".input-tooltip").hide();
    }
)

$("#signupForm").keypress(function (event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13') {
        $("#signup-submit").click();
    }
});

$("#loginForm").keypress(function (event) {
    var keycode = (event.keyCode ? event.keyCode : event.which);
    if (keycode == '13') {
        $("#loginButton").click();
    }
});

$(".signup-login").click(function () {
    $("#signupForm").toggle();
    $("#loginForm").toggle();
    $("#loginTitle").toggle();
    $("#signupTitle").toggle();
})

$("#forgotSection, .signupSection").click(function () {
    $("#loginFormError").hide();
    $("#loginNameBox").val("");
    $("#loginPasswordBox").val("");
})

// $("#loginForm").find("input").keyup(function () {
//     checkLoginForm();
// })

$("#signupForm").find(".input").keyup(function () {
    checkSignUpForm();
})

$("#signup-termCheck").change(function () {
    checkSignUpForm();
})

$(".link-to-login").click(function () {
    $("header").children().hide();
    $("#formArea").children().hide();
    $("#loginTitle").show();
    $("#loginForm").show();
});

$(".logOutLink").click(function () {
    cookieLogout();
});

$("#loginButton").click(function () {
    if (checkLoginForm()) {
        var username = document.getElementById("loginNameBox").value;
        var password = document.getElementById("loginPasswordBox").value;
        // userLogin(username, password);
        cookieLogin(username, password);
    }
});

$("#resend-code").click(function () {
    cognitoUser.resendConfirmationCode(function (err, result) {
        if (err) {
            console.error(err);
            showFormError($("#verifyFormError"), err.message);
            return;
        } else {
            $("#verifyFormError").hide();
        }
    });
})

$("#signup-submit").click(function () {
    if (checkSignUpForm()) {
        var username = document.getElementById("signup-email").value;
        var password = document.getElementById("signup-password").value;

        var attributeList = [];

        var dataGivenName = {
            Name: 'given_name',
            Value: $("#signup-firstName").val()
        };
        var dataFamilyName = {
            Name: 'family_name',
            Value: $("#signup-lastName").val()
        };
        var dataCompany = {
            Name: 'custom:company',
            Value: $("#signup-company").val()
        };

        var attributeFirstName = new AmazonCognitoIdentity.CognitoUserAttribute(dataGivenName);
        var attributeFamilyName = new AmazonCognitoIdentity.CognitoUserAttribute(dataFamilyName);
        var attributeCompany = new AmazonCognitoIdentity.CognitoUserAttribute(dataCompany);

        attributeList.push(attributeFirstName);
        attributeList.push(attributeFamilyName);
        attributeList.push(attributeCompany);

        userPool.signUp(username, password, attributeList, null, function (err, result) {
            if (err) {
                console.error(err);
                showFormError($("#signupFormError"), err.message);
                return;
            } else {
                $("#verifyFormError").hide();
            }
            cognitoUser = result.user;

            // if (!cookieAuthFlag) {
            //     localPassword = password;
            //     xcLocalStorage.setItem("xcalarUsername", username);
            // }
            $("#signupForm").hide();
            $("#signupTitle").hide();
            $("#verifyForm").show();
            $("#verifyTitle").show();
        });
    } else {
        signupSubmitClicked = true;
        checkSignUpForm();
    }
});

function checkVerifyForm() {
    var code = $("#verify-code").val();
    if (!code) {
        showFormError($("#verifyFormError"), "Please enter your verification code.");
        return false;
    } else {
        $("#verifyFormError").hide();
        return true;
    }
}

$("#verify-submit").click(function () {
    if (checkVerifyForm()) {
        var code = $("#verify-code").val();
        cognitoUser.confirmRegistration(code, true, function (err, result) {
            if (err) {
                console.error(err);
                showFormError($("#verifyFormError"), err.message);
                return;
            } else {
                $("#verifyFormError").hide();
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#loginTitle").show();
                $("#loginForm").show();
            }
            // var authenticationData = {
            //     Username: xcLocalStorage.getItem("xcalarUsername"),
            //     Password: localPassword,
            // };
            // var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

            // if (localPassword) {
            //     cognitoUserLogin(cognitoUser, authenticationDetails);
            // } else {
            //     $("header").children().hide();
            //     $("#formArea").children().hide();
            //     $("#loginTitle").show();
            //     $("#loginForm").show();
            // };
        });
    }
});

var selectedClusterSize;

$("#clusterForm").find(".radioButton").click(function () {
    // document.getElementById("deployBtn").classList.remove('btn-disabled');

    selectedClusterSize = $(this).data('option');

    if ($(this).hasClass("active") || (!$(this).is(":visible"))) {
        return false;
    }
    var $radioButtonGroup = $(this).closest(".radioButtonGroup");
    var $activeRadio = $(this);
    $radioButtonGroup.find("> .radioButton").removeClass("active");
    $activeRadio.addClass("active");
    return false;
});

$("#deployBtn").click(function () {
    if (checkClusterForm()) {
        fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/start", {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                body: JSON.stringify({
                    "username": localUsername,
                    "clusterParams": {
                        "type": selectedClusterSize
                    }
                }),
            }).then(function (response) {
                return response.json();
            })
            .then(function (myJson) {
                getCluster();
            });
    }
});

$("#forgotSection a").click(function () {
    $("#loginForm").hide();
    $("#loginTitle").hide();
    $("#forgotPasswordForm").show();
    $("#forgotPasswordTitle").show();
});

function checkForgotPasswordForm() {
    var forgotPasswordEmail = $("#forgot-password-email").val()
    if (forgotPasswordEmail && validateEmail(forgotPasswordEmail)) {
        $("#forgotPasswordFormError").hide();
        return true;
    } else {
        showFormError($("#forgotPasswordFormError"), "Please enter a valid email for password recovery.");
        return false;
    }
}

function checkClusterForm() {
    if (!selectedClusterSize) {
        showFormError($("#clusterFormError"), "Please select your cluster size.");
        return false;
    } else {
        $("#clusterFormError").hide();
        return true;
    }
}

function checkConfirmForgotPasswordForm() {
    var verificationCode = $("#confirm-forgot-password-code").val();
    var newPassword1 = $("#confirm-forgot-password-new-password").val();
    var newPassword2 = $("#confirm-forgot-password-confirm-new-password").val();
    if (verificationCode && newPassword1 && validatePassword(newPassword1) && newPassword1 === newPassword2) {
        $("#confirmForgotPasswordFormError").hide();
        return true;
    } else {
        showFormError(
            $("#confirmForgotPasswordFormError"),
            "Please fill all fields correctly to reset password. New password must contain lowercase, " +
            "uppercase, number, a special character, and must be at least 8 characters long. "
        );
        return false;
    }
}

$("#forgot-password-submit").click(function () {
    if (checkForgotPasswordForm()) {
        var userData = {
            Username: $("#forgot-password-email").val(),
            Pool: userPool
        };
        cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        cognitoUser.forgotPassword({
            onSuccess: function () {
                $("#forgotPasswordFormError").hide();
                $("#forgotPasswordForm").hide();
                $("#forgotPasswordTitle").hide();
                $("#confirmForgotPasswordForm").show();
                $("#confirmForgotPasswordTitle").show();
            },
            onFailure: function (err) {
                showFormError($("#forgotPasswordFormError"), err.message);
            }
        });
    }
});

$("#confirm-forgot-password-submit").click(function () {
    if (checkConfirmForgotPasswordForm()) {
        var verificationCode = $("#confirm-forgot-password-code").val();
        var newPassword = $("#confirm-forgot-password-new-password").val();
        cognitoUser.confirmPassword(verificationCode, newPassword, {
            onSuccess: function () {
                $("#confirmForgotPasswordFormError").hide();
                $("#confirmForgotPasswordForm").hide();
                $("#confirmForgotPasswordTitle").hide();
                $("#loginForm").show();
                $("#loginTitle").show();
            },
            onFailure: function (err) {
                showFormError($("#confirmForgotPasswordFormError"), err.message);
            }
        });
    }
});

function showClusterIsReadyScreen() {
    $("#loadingTitle").html("Your cluster is ready!");
    progressBar.end("Redirecting to Xcalar Cloud...")
}

let progressBar = new ProgressBar({
    $container: $("#loadingForm"),
    completionTime: 100,
    progressTexts: [
        'Creating Xcalar cluster',
        'Starting Xcalar cluster',
        'Initializing Xcalar cluster',
        'Running health checks',
        'Setting up user preferences'
    ],
    numVisibleProgressTexts: 5
});

function deployingClusterAnimation() {
    if (!progressBar.isStarted()) {
        progressBar.start("Please wait while your cluster loads...");
    }
}