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
                "username": xcLocalStorage.getItem("xcalarUsername")
            }),
        })
        .then(res => res.json())
        .then(clusterGetResponse => {
            if (clusterGetResponse.status !== 0) {
                // error
                console.error('getCluster error. cluster/get returned: ');
                console.log(clusterGetResponse)
                handleException();
            } else if (clusterGetResponse.isPending === false && clusterGetResponse.clusterUrl === undefined) {
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
        .catch(error => {
            console.error('getCluster error caught:', error);
            handleException();
        });
}

function goToXcalar(clusterGetResponse) {
    window.location.href = clusterGetResponse.clusterUrl + "/assets/htmlFiles/login.html?cloud=true";
}

// function checkLoginForm() {
//     var email = document.getElementById("loginNameBox").value;
//     var password = document.getElementById("loginPasswordBox").value;
//     if (email && password && validateEmail(email) && validatePassword(password)) {
//         // if ($("#loginButton").hasClass("btn-disabled")) {
//         //     $("#loginButton").removeClass("btn-disabled");
//         // }
//     } else {
//         // if (!$("#loginButton").hasClass("btn-disabled")) {
//         //     $("#loginButton").addClass("btn-disabled");
//         // }
//     }
// }

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
            $("#signupFormError").show()
        }
        return false;
    }
}

$(".signup-login").click(function () {
    $("#signupForm").toggle();
    $("#loginForm").toggle();
    $("#loginTitle").toggle();
    $("#signupTitle").toggle();
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
    xcLocalStorage.setItem("xcalarTokens", "");
});

// $("#confirmForgotPasswordForm").find(".input").keyup(function () {
//     var password1 = $("#confirm-forgot-password-new-password").val();
//     var password2 = $("#confirm-forgot-password-confirm-new-password").val();
//     var filledAllFields = $("#confirm-forgot-password-code").val() && password1 && password2;
//     var passwordsMatch = password1 === password2;
//     if (filledAllFields && passwordsMatch) {
//         // if ($("#confirm-forgot-password-submit").hasClass("btn-disabled")) {
//         //     $("#confirm-forgot-password-submit").removeClass("btn-disabled");
//         // }
//     } else {
//         // if (!$("#confirm-forgot-password-submit").hasClass("btn-disabled")) {
//         //     $("#confirm-forgot-password-submit").addClass("btn-disabled");
//         // }
//     }
// })

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
    } else {
        signupSubmitClicked = true;
        checkSignUpForm();
    }
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
    if (selectedClusterSize) {
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

    } else {
        // cluster size not selected
    }
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

function showClusterIsReadyScreen() {
    $("#loadingTitle").html("Your cluster is ready!");
    progressBar.end("Redirecting to Xcalar Cloud...")
}

let progressBar = new ProgressBar({
    $container: $("#loadingForm"),
    completionTime: 100,
    progressTexts: [
        'Feeding the hamsters',
        'Setting up the tiny hamster wheels',
        'Powering up the hamster engines',
        'Charging the flux capacitors',
        'Engaging the hamster wheels',
        'Not eating up the hamsters',
        'Hugging the hamsters',
        'Blowing up the servers',
        'Restoring the servers',
        'Polishing up'
    ],
    progressTextsOpacities: [
        100,
        77,
        55,
        33,
        10
    ]
});

function deployingClusterAnimation() {
    if (!progressBar.isStarted()) {
        progressBar.start();
    }
}
