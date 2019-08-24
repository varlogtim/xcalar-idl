$(".signup-login").click(function () {
    $("#signupForm").toggle();
    $("#loginForm").toggle();
    $("#loginTitle").toggle();
    $("#signupTitle").toggle();
})

// dev only
$(".verify").click(function () {
    $("#signupForm").toggle();
    $("#verifyForm").toggle();
    $("#signupTitle").toggle();
    $("#verifyTitle").toggle();
})

// dev only
$(".cluster").click(function () {
    $("#verifyForm").toggle();
    $("#clusterForm").toggle();
    $("#verifyTitle").toggle();
    $("#clusterTitle").toggle();
})

var signupScreen = new URLSearchParams(window.location.search).has("signup");

if (signupScreen) {
    $("#signupTitle").show();
    $("#signupForm").show();
} else {
    $("#loginTitle").show();
    $("#loginForm").show();
}

var localTokens = xcSessionStorage.getItem("xcalarTokens");

if (localTokens) {
    localTokens = JSON.parse(localTokens);
    console.log(localTokens);

    // TODO: if outdated
    updateJWT(localTokens)
        .then((newTokens) => {
            xcSessionStorage.setItem("xcalarTokens", JSON.stringify(newTokens));
            localTokens = newTokens
            getCredentials(localTokens["idToken"]["jwtToken"])
        })
}

async function updateJWT(oldTokens) {
    let newTokens = oldTokens;
    fetch("https://cognito-idp.us-west-2.amazonaws.com/", {
        headers: {
            "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
            "Content-Type": "application/x-amz-json-1.1",
        },
        mode: 'cors',
        cache: 'no-cache',
        method: 'POST',
        body: JSON.stringify({
            ClientId: "4ueg9b4v9gf80goc7367utm2g7",
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
                REFRESH_TOKEN: oldTokens["refreshToken"]["token"],
            }
        }),
    }).then((res) => {
        return res.json()
    }).then((result) => {
        newTokens["idToken"] = result.AuthenticationResult.IdToken;
        newTokens["accessToken"] = result.AuthenticationResult.AccessToken;
        // getCredentials(newTokens["id_token"])
    })
    return newTokens;
}

function getCredentials(idToken) {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: 'us-west-2:7afc1673-6fe1-4943-a913-e43f2715131d',
        Logins: {
            'cognito-idp.us-west-2.amazonaws.com/us-west-2_oVT7JOBHX': idToken
        }
    }, {
        region: 'us-west-2'
    });
    AWS.config.credentials.get(function (err) {
        if (err) {
            console.log("credentials get error: " + err);
            console.log("AWS creds: " + JSON.stringify(AWS.config.credentials));
        } else {
            var accessKeyId = AWS.config.credentials.accessKeyId;
            var secretAccessKey = AWS.config.credentials.secretAccessKey;
            var sessionToken = AWS.config.credentials.sessionToken;
            console.log("accessKeyId: " + accessKeyId);
            console.log("secretAccessKey: " + secretAccessKey);
            console.log("sessionToken: " + sessionToken);
            // window.location.href = "/"; 
        }
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
            $("#loginButton").removeClass("btn-disabled")
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
            $("#signup-submit").removeClass("btn-disabled")
        }
    } else {
        if (!$("#signup-submit").hasClass("btn-disabled")) {
            $("#signup-submit").addClass("btn-disabled");
        }
    }
}

$("#loginForm").find("input").keyup(function () {
    if (fieldsFilled($("#loginForm"))) {
        if ($("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").removeClass("btn-disabled")
        }
    } else {
        if (!$("#loginButton").hasClass("btn-disabled")) {
            $("#loginButton").addClass("btn-disabled");
        }
    }
})

$("#signupForm").find(".input").keyup(function () {
    checkSignUpForm()
})

$("#signup-termCheck").change(function () {
    checkSignUpForm()
})

$("#loginButton").click(function () {
    var username = document.getElementById("loginNameBox").value;
    var password = document.getElementById("loginPasswordBox").value;
    var authenticationData = {
        Username: username,
        Password: password,
    };
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    var poolData = {
        UserPoolId: 'us-west-2_oVT7JOBHX',
        ClientId: '4ueg9b4v9gf80goc7367utm2g7'
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    var userData = {
        Username: username,
        Pool: userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function () {
            var cognitoUser = userPool.getCurrentUser();
            if (cognitoUser != null) {
                cognitoUser.getSession(function (err, tokens) {
                    if (tokens) {
                        xcSessionStorage.setItem("xcalarTokens", JSON.stringify(tokens));
                        getCredentials(tokens["idToken"]["jwtToken"])
                    }
                });
            }
        },
        onFailure: function (err) {
            console.log(err);
        },
    });
});

$("#signup-submit").click(function () {
    var username = document.getElementById("signup-email").value;
    var password = document.getElementById("signup-password").value;
    var poolData = {
        UserPoolId: 'us-west-2_oVT7JOBHX',
        ClientId: '4ueg9b4v9gf80goc7367utm2g7'
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    var attributeList = [];

    userPool.signUp(username, password, attributeList, null, function (err, result) {
        if (err) {
            console.log(err);
            alert(err);
            return;
        }
        cognitoUser = result.user;
        console.log('signed up! user name is ' + cognitoUser.getUsername());
        $("#signupForm").toggle();
        $("#verifyForm").toggle();
        $("#signupTitle").toggle();
        $("#verifyTitle").toggle();
    });
});

$("#verify-submit").click(function () {
    var code = document.getElementById("verify-code").value;
    cognitoUser.confirmRegistration(code, true, function (err, result) {
        if (err) {
            alert(err);
            return;
        }
        alert(result);
    });
});

$("#clusterForm").find(".radioButton").click(function () {
    document.getElementById("deployBtn").classList.remove('btn-disabled')

    if ($(this).hasClass("active") || (!$(this).is(":visible"))) {
        return false;
    }
    var $radioButtonGroup = $(this).closest(".radioButtonGroup");
    var $activeRadio = $(this);
    $radioButtonGroup.find("> .radioButton").removeClass("active");
    $activeRadio.addClass("active");
    return false;
});

// let clusterID = "";
// let clusterSize = "m5.xlarge";


$("#deployBtn").click(function () {
    alert('TODO: DEPLOYING CLUSTER')

    // fetch("https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/cluster/start", {
    //     headers: {
    //         // "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    //         // "x-api": "WFFbjWNnC4avdRM6f1SpK7vx2fp1F2r886136eIw",
    //         "Content-Type": "application/json",
    //     },
    //     mode: 'no-cors',
    //     cache: 'no-cache',
    //     method: 'POST',
    //     body: JSON.stringify({
    //         // "userName": "wlu@xcalar.com"
    //       "command": "start_cluster",
    //       "token": "test_token",
    //       "clusterParams": {"instanceType": clusterSize}
    //     }),
    // }).then((res) => {
    //     console.log(res)
    // })
});