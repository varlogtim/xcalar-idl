// fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/stop", {
//     headers: {
//         "Content-Type": "application/json",
//     },
//     method: 'POST',
//     body: JSON.stringify({
//         "username": "sdavletshin@xcalar.com"
//     }),
// }).then(response => response.json())
// .then(res => {console.log(res)})

var userPoolId = "us-west-2_Eg94nXgA5";
var clientId = "69vk7brpkgcii8noqqsuv2dvbt";
var identityPoolId = "us-west-2:7afc1673-6fe1-4943-a913-e43f2715131d";

var poolData = {
    UserPoolId: userPoolId,
    ClientId: clientId
};
var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
var localPassword;
var cognitoUser;

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
    showInitialScreens()
}

function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace('-', '+').replace('_', '/');
        const decodedJwt = JSON.parse(window.atob(base64));
        return decodedJwt;
    } catch (error) {
        console.error(error);
        handleException();
    }
}

function getExpiryTime(tokens) {
    var idToken = tokens["idToken"]
    if (typeof idToken === "string") {
        return decodeJwt(idToken)["exp"]
    } else {
        return idToken["payload"]["exp"]
    }
}

var localTokens = xcLocalStorage.getItem("xcalarTokens");

// console.log('localTokens');
// console.log(localTokens);

if (localTokens && localTokens !== "undefined") {
    getCredentials(JSON.parse(localTokens))
} else {
    showInitialScreens()
}

async function updateTokens(oldTokens) {
    let newTokens = oldTokens;
    return fetch("https://cognito-idp.us-west-2.amazonaws.com/", {
            headers: {
                "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
                "Content-Type": "application/x-amz-json-1.1",
            },
            mode: 'cors',
            cache: 'no-cache',
            method: 'POST',
            body: JSON.stringify({
                ClientId: clientId,
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                AuthParameters: {
                    REFRESH_TOKEN: oldTokens["refreshToken"]["token"],
                }
            }),
        })
        .then(res => res.json())
        .then(result => {
            newTokens["idToken"] = result.AuthenticationResult.IdToken;
            newTokens["accessToken"] = result.AuthenticationResult.AccessToken;
            xcLocalStorage.setItem("xcalarTokens", JSON.stringify(newTokens));
            return newTokens;
        })
        .catch(error => {
            console.error('updateTokens error:', error);
            handleException();
        });
}

async function getCredentials(tokens) {
    var expiryTime = getExpiryTime(tokens);
    if (Date.now() / 1000 >= expiryTime) {
        // if (true) {
        tokens = await updateTokens(tokens);
    }
    var loginApiUrl = "cognito-idp.us-west-2.amazonaws.com/" + userPoolId;

    try {
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: identityPoolId,
            Logins: {
                [loginApiUrl]: tokens["idToken"]["jwtToken"]
            }
        }, {
            region: 'us-west-2'
        });
        AWS.config.credentials.get(function (err) {
            if (err) {
                console.error('AWS.config.credentials.get error: ', err);
                showInitialScreens();
            } else {
                var accessKeyId = AWS.config.credentials.accessKeyId;
                var secretAccessKey = AWS.config.credentials.secretAccessKey;
                var sessionToken = AWS.config.credentials.sessionToken;
                getCluster();
            }
        });
    } catch (error) {
        console.error('AWS.config.credentials error: ', error);
    }
}

function loginUser(cognitoUser, authenticationDetails) {
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function () {
            cognitoUser = userPool.getCurrentUser();
            if (cognitoUser != null) {
                cognitoUser.getSession(function (err, tokens) {
                    if (tokens && tokens !== "undefined") {
                        xcLocalStorage.setItem("xcalarTokens", JSON.stringify(tokens));
                        getCredentials(tokens);
                    }
                });
            }
        },
        onFailure: function (err) {
            if (err.code === "UserNotConfirmedException") {
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#verifyForm").show();
                $("#verifyTitle").show();
            } else {
                $("#loginFormError").show(); // only for login
            }
            console.error(err);
        },
    });
}

function getCluster() {
    fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/get", {
            headers: {
                "Content-Type": "application/json",
            },
            method: 'POST',
            body: JSON.stringify({
                "username": xcLocalStorage.getItem("xcalarUsername"),
                "clusterParams": {
                    "type": "small"
                }
            }),
        })
        .then(res => res.json())
        .then(clusterGetResponse => {
            if (clusterGetResponse.status !== 0 || (clusterGetResponse.isPending === false && clusterGetResponse.clusterUrl === undefined)) {
                // go to cluster selection screen
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#clusterTitle").show();
                $("#clusterForm").show();
            } else if (clusterGetResponse.isPending) {
                // go to wait screen
                setTimeout(getCluster, 3000);
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#loadingTitle").show();
                $("#loadingForm").show();
            } else {
                // redirect to cluster
                window.location.href = clusterGetResponse.clusterUrl + "/assets/htmlFiles/login.html?cloud=true";
            }
        })
        .catch(error => {
            console.error('getCluster error:', error);
            handleException();
        });
}

function checkLoginForm() {
    var username = document.getElementById("loginNameBox").value;
    var password = document.getElementById("loginPasswordBox").value;
    if (!username || !password) {
        if (!$("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").addClass("btn-disabled");
        }
    } else {
        if ($("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").removeClass("btn-disabled");
        }
    }
}

function fieldsFilled($parent) {
    var emptyInputs = $parent.find(".input").filter(function () {
        return this.value === "";
    });
    return emptyInputs.length === 0;
}

function checkSignUpForm() {
    var filledAllFields = fieldsFilled($("#signupForm"));
    var checkedEULA = $("#signup-termCheck").prop('checked');
    var emailsMatch = $("#signup-password").val() === $("#signup-confirmPassword").val();
    var passwordsMatch = $("#signup-email").val() === $("#signup-confirmEmail").val();
    if (filledAllFields && checkedEULA && emailsMatch && passwordsMatch) {
        if ($("#signup-submit").hasClass("btn-disabled")) {
            $("#signup-submit").removeClass("btn-disabled");
        }
    } else {
        if (!$("#signup-submit").hasClass("btn-disabled")) {
            $("#signup-submit").addClass("btn-disabled");
        }
    }
}

function btnDisableToggle($input, $btn) {
    $input.keyup(function () {
        if (!($input.val() === "")) {
            if ($btn.hasClass("btn-disabled")) {
                $btn.removeClass("btn-disabled");
            }
        } else {
            if (!$btn.hasClass("btn-disabled")) {
                $btn.addClass("btn-disabled");
            }
        }
    })
}

$(".signup-login").click(function () {
    $("#signupForm").toggle();
    $("#loginForm").toggle();
    $("#loginTitle").toggle();
    $("#signupTitle").toggle();
})

$("#loginForm").find("input").keyup(function () {
    if (fieldsFilled($("#loginForm"))) {
        if ($("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").removeClass("btn-disabled");
        }
    } else {
        if (!$("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").addClass("btn-disabled");
        }
    }
})

$("#signupForm").find(".input").keyup(function () {
    checkSignUpForm();
})

$("#signup-termCheck").change(function () {
    checkSignUpForm();
})

$("#confirmForgotPasswordForm").find(".input").keyup(function () {
    var filledAllFields = fieldsFilled($("#confirmForgotPasswordForm"))
    var passwordsMatch = $("#confirm-forgot-password-new-password").val() === $("#confirm-forgot-password-confirm-new-password").val();
    if (filledAllFields && passwordsMatch) {
        if ($("#confirm-forgot-password-submit").hasClass("btn-disabled")) {
            $("#confirm-forgot-password-submit").removeClass("btn-disabled");
        }
    } else {
        if (!$("#confirm-forgot-password-submit").hasClass("btn-disabled")) {
            $("#confirm-forgot-password-submit").addClass("btn-disabled");
        }
    }
})

btnDisableToggle($("#verify-code"), $("#verify-submit"));
btnDisableToggle($("#forgot-password-code"), $("#forgot-password-submit"));

$("#loginButton").click(function () {
    username = document.getElementById("loginNameBox").value;
    var password = document.getElementById("loginPasswordBox").value;

    var authenticationData = {
        Username: username,
        Password: password,
    };
    var userData = {
        Username: username,
        Pool: userPool
    };

    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    xcLocalStorage.setItem("xcalarUsername", username);
    loginUser(cognitoUser, authenticationDetails);
});

$("#resend-code").click(function () {
    cognitoUser.resendConfirmationCode(function (err, result) {
        if (err) {
            console.error(err);
            alert(err);
            return;
        }
    });
})

$("#signup-submit").click(function () {
    var username = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-password").value;

    var attributeList = [];

    var dataGivenName = {
        Name: 'given_name',
        Value: $("signup-firstName").val()
    };
    var dataFamilyName = {
        Name: 'family_name',
        Value: $("signup-lastName").val()
    };
    var dataCompany = {
        Name: 'custom:company',
        Value: $("signup-company").val()
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
            alert(err);
            return;
        }
        localPassword = password;
        cognitoUser = result.user;
        xcLocalStorage.setItem("xcalarUsername", username);
        $("#signupForm").hide();
        $("#signupTitle").hide();
        $("#verifyForm").show();
        $("#verifyTitle").show();
    });
});

$("#verify-submit").click(function () {
    var code = document.getElementById("verify-code").value;
    cognitoUser.confirmRegistration(code, true, function (err, result) {
        if (err) {
            console.error(err);
            alert(err);
            return;
        }
        var authenticationData = {
            Username: xcLocalStorage.getItem("xcalarUsername"),
            Password: localPassword,
        };
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        if (localPassword) {
            loginUser(cognitoUser, authenticationDetails);
        } else {
            $("header").children().hide();
            $("#formArea").children().hide();
            $("#loginTitle").show();
            $("#loginForm").show();
        };
    });
});

var selectedClusterSize;

$("#clusterForm").find(".radioButton").click(function () {
    document.getElementById("deployBtn").classList.remove('btn-disabled');

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
    // start
    fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/start", {
            headers: {
                "Content-Type": "application/json",
            },
            method: 'POST',
            body: JSON.stringify({
                "username": xcLocalStorage.getItem("xcalarUsername"),
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
});

$("#forgotSection").click(function () {
    $("#loginForm").hide();
    $("#loginTitle").hide();
    $("#forgotPasswordForm").show();
    $("#forgotPasswordTitle").show();
});

$("#forgot-password-submit").click(function () {
    var userData = {
        Username: $("#forgot-password-code").val(),
        Pool: userPool
    };
    cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.forgotPassword({
        onSuccess: function () {
            $("#forgotPasswordForm").hide();
            $("#forgotPasswordTitle").hide();
            $("#confirmForgotPasswordForm").show();
            $("#confirmForgotPasswordTitle").show();
        },
        onFailure: function (err) {
            alert(err);
        }
    });
});

$("#confirm-forgot-password-submit").click(function () {
    var verificationCode = $("#confirm-forgot-password-code").val();
    var newPassword = $("#confirm-forgot-password-new-password").val();
    cognitoUser.confirmPassword(verificationCode, newPassword, {
        onSuccess: function () {
            $("#confirmForgotPasswordForm").hide();
            $("#confirmForgotPasswordTitle").hide();
            $("#loginForm").show();
            $("#loginTitle").show();
        },
        onFailure: function (err) {
            alert(err);
        }
    });
});