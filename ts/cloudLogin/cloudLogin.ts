interface ClusterGetResponse {
    status: number,
    isPending?: string
    error?: string,
    clusterUrl?: string
}

namespace CloudLogin {
    const userPoolId: string = "us-west-2_Eg94nXgA5";
    const clientId: string = "69vk7brpkgcii8noqqsuv2dvbt";
    const cookieAuthApiUrl: string = "https://605qwok4pl.execute-api.us-west-2.amazonaws.com";

    const poolData = {
        UserPoolId: userPoolId,
        ClientId: clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    let localUsername: string;
    let localSessionId: string;
    let cognitoUser;
    let selectedClusterSize: string;

    export function setup(): void {
        initialStatusCheck();
        handleEvents();
    }

    function initialStatusCheck(): void {
        fetch(cookieAuthApiUrl + "/prod/status", {
            credentials: 'include',
        })
        .then(res => res.json())
        .then(response => {
            if (response.loggedIn === true) {
                localUsername = response.emailAddress;
                localSessionId = response.sessionId;
                clusterSelection();
            } else if (response.loggedIn === false) {
                showInitialScreens();
                localSessionId = "";
            } else {
                console.error('cookieLoggedInStatus unrecognized code:', response);
            }
        }).catch(error => {
            console.error('cookieLoggedInStatus error:', error);
            // handle it as a not logged in case
            showInitialScreens();
        });
    }

    function cookieLogin(username: string, password: string): void {
        const $button = $("#loginButton");
        $button.addClass("xc-disabled");
        loadingWait(true);
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
        })
        .finally(() => loadingWait(false));
    }

    function cookieLogout(handleExceptionFlag: boolean): void {
        loadingWait(true);
        fetch(cookieAuthApiUrl + "/prod/logout", {
            credentials: 'include',
        })
        .then(response => {
            if (response.status === 200) {
                localSessionId = "";
            } else if (response.status === 500) {
                console.error('error logging out:', response);
                if (handleExceptionFlag) {
                    console.error('cookieLogout 500 code:', response);
                    handleException(response);
                }
            } else {
                console.error('cookieLogout unrecognized code:', response);
                if (handleExceptionFlag) {
                    handleException(response);
                }
            }
        }).catch(error => {
            console.error('cookieLogut error:', error);
            if (handleExceptionFlag) {
                handleException(error);
            }
        })
        .finally(() => loadingWait(false));
    }

    function checkCredit(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            loadingWait(true);
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
                handleException(error);
                reject(error);
            })
            .finally(() => loadingWait(false));
        });
    }


    function getCluster(): Promise<void> {
        loadingWait(true);
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
                    console.warn(clusterGetResponse);
                    setTimeout(() => getCluster(), 3000);
                    $("header").children().hide();
                    $("#formArea").children().hide();
                    $("#loadingTitle").show();
                    $("#loadingForm").show();
                    deployingClusterAnimation();
                    return;
                } else {
                    handleException(clusterGetResponse.error);
                }
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
            handleException(error);
        })
        .finally(() => loadingWait(false));
    }

    function clusterSelection(cb?: Function) {
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

    function goToXcalar(clusterGetResponse: ClusterGetResponse): void {
        const sessionId: string = localSessionId;
        if (!sessionId || !clusterGetResponse.clusterUrl) {
            handleException(clusterGetResponse.error);
            return;
        }
        var url = clusterGetResponse.clusterUrl + "/" + paths.login +
        "?cloudId=" + encodeURIComponent(sessionId);
        window.location.href = url;
    }

    function showInitialScreens(): void {
        $("header").children().hide()
        $("#formArea").children().hide()
        const signupScreen: boolean = new URLSearchParams(window.location.search).has("signup");
        if (signupScreen) {
            $("#signupTitle").show();
            $("#signupForm").show();
        } else {
            $("#loginTitle").show();
            $("#loginForm").show();
        }
    }

    function handleException(error: any): void {
        if (!(typeof error === 'string') && !(error instanceof String)) {
            error = "A server error has ocurred."
        }

        $("#exceptionFormError .text").html(error);

        cookieLogout(false);
        $("header").children().hide();
        $("#formArea").children().hide();
        $("#exceptionTitle").show();
        $("#exceptionForm").show();
    }

    function checkLoginForm(): boolean {
        const email: string = $("#loginNameBox").val();
        const password: string = $("#loginPasswordBox").val();
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

    function showFormError($errorBox, errorText): void {
        $errorBox.children(".text").html(errorText);
        $errorBox.show();
    }

    function validateEmail(email): boolean {
        return email.match(/\S+@\S+\.\S+/);
    }

    function validatePassword(password): boolean {
        return password.match(/(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/)
    }

    let signupSubmitClicked: boolean = false;
    let focusTooltipShown: boolean = false;

    function hideTooltip($element: JQuery): void {
        if (!focusTooltipShown) {
            $element.find(".input-tooltip").hide();
        }
    }

    function showTooltip($element: JQuery): void {
        if (!focusTooltipShown) {
            $element.find(".input-tooltip").show();
        }
    }

    function showInputError($element: JQuery, condition: boolean): void {
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

    function showPasswordErrorRows(password: string): void {
        const lowerCaseLetters: RegExp = /[a-z]/g;
        if (password.match(lowerCaseLetters)) {
            $("#passwordLowerTooltipError").removeClass("errorTooltipRow");
        } else {
            $("#passwordLowerTooltipError").addClass("errorTooltipRow");
        }

        // Validate capital letters
        const upperCaseLetters: RegExp = /[A-Z]/g;
        if (password.match(upperCaseLetters)) {
            $("#passwordUpperTooltipError").removeClass("errorTooltipRow");
        } else {
            $("#passwordUpperTooltipError").addClass("errorTooltipRow");
        }

        // Validate numbers
        const numbers: RegExp = /[0-9]/g;
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
        const specialCharacters: RegExp = /\W/g;
        if (password.match(specialCharacters)) {
            $("#passwordSpecialTooltipError").removeClass("errorTooltipRow");
        } else {
            $("#passwordSpecialTooltipError").addClass("errorTooltipRow");
        }
    }

    function checkSignUpForm(): boolean {
        const firstNameEmpty: boolean = $("#signup-firstName").val() === "";
        const lastNameEmpty: boolean = $("#signup-lastName").val() === "";
        const companyEmpty: boolean = $("#signup-company").val() === "";
        const email1: string = $("#signup-email").val();
        const email2: string = $("#signup-confirmEmail").val();
        const password1: string = $("#signup-password").val();
        const password2: string = $("#signup-confirmPassword").val();
        const emailsMatch: boolean = email1 === email2;
        const passwordsMatch: boolean = password1 === password2;
        const checkedEULA: boolean = $("#signup-termCheck").prop('checked');

        if (signupSubmitClicked) {
            showInputError($("#firstNameSection"), firstNameEmpty);
            showInputError($("#lastNameSection"), lastNameEmpty);
            showInputError($("#companySection"), companyEmpty);
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

        const inputIsCorrect: boolean = !firstNameEmpty &&
            !lastNameEmpty &&
            !companyEmpty &&
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

    let loadingWaitIntervalID: number;

    function loadingWait(waitFlag: boolean): void {
        if (waitFlag) {
            $('.auth-section').addClass('auth-link-disabled');
            $('.btn').addClass('btn-disabled');

            $('.btn').append('<span class="loading-dots"></span>')
            let dotsCount: number = 0
            loadingWaitIntervalID = <any>setInterval(function() {
                dotsCount = (dotsCount + 1) % 4;
                $('.btn .loading-dots').text('.'.repeat(dotsCount));
            }, 1000);
        } else {
            $('.auth-section').removeClass('auth-link-disabled');
            $('.btn').removeClass('btn-disabled');

            clearInterval(loadingWaitIntervalID);
            $('.btn .loading-dots').remove();
        }
    }

    function checkVerifyForm(): boolean {
        const code: string = $("#verify-code").val();
        if (!code) {
            showFormError($("#verifyFormError"), "Please enter your verification code.");
            return false;
        } else {
            $("#verifyFormError").hide();
            return true;
        }
    }

    function checkForgotPasswordForm(): boolean {
        let forgotPasswordEmail: string = $("#forgot-password-email").val()
        if (forgotPasswordEmail && validateEmail(forgotPasswordEmail)) {
            $("#forgotPasswordFormError").hide();
            return true;
        } else {
            showFormError($("#forgotPasswordFormError"), "Please enter a valid email for password recovery.");
            return false;
        }
    }

    function checkClusterForm(): boolean {
        if (!selectedClusterSize) {
            showFormError($("#clusterFormError"), "Please select your cluster size.");
            return false;
        } else {
            $("#clusterFormError").hide();
            return true;
        }
    }

    function checkConfirmForgotPasswordForm(): boolean {
        const verificationCode: string = $("#confirm-forgot-password-code").val();
        const newPassword1: string = $("#confirm-forgot-password-new-password").val();
        const newPassword2: string = $("#confirm-forgot-password-confirm-new-password").val();
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

    function showClusterIsReadyScreen(): void {
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

    function deployingClusterAnimation(): void {
        if (!progressBar.isStarted()) {
            progressBar.start("Please wait while your cluster loads...");
        }
    }

    function handleEvents(): void {
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
            const keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == 13) {
                $("#signup-submit").click();
            }
        });

        $("#loginForm").keypress(function (event) {
            const keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == 13) {
                $("#loginButton").click();
            }
        });

        $(".signup-login").click(function () {
            $("#signupForm").toggle();
            $("#loginForm").toggle();
            $("#loginTitle").toggle();
            $("#signupTitle").toggle();
        })

        $("#forgotSection a, .signupSection a").click(function () {
            $("#loginFormError").hide();
            $("#loginNameBox").val("");
            $("#loginPasswordBox").val("");
        })

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
            cookieLogout(true);
        });

        $("#loginButton").click(function () {
            if (checkLoginForm()) {
                var username = $("#loginNameBox").val();
                var password = $("#loginPasswordBox").val();
                cookieLogin(username, password);
            }
        });

        $("#resend-code").click(function () {
            loadingWait(true);
            cognitoUser.resendConfirmationCode(function (err, result) {
                loadingWait(false);
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
                const username = $("#signup-email").val();
                const password = $("#signup-password").val();

                const attributeList = [];

                const dataGivenName = {
                    Name: 'given_name',
                    Value: $("#signup-firstName").val()
                };
                const dataFamilyName = {
                    Name: 'family_name',
                    Value: $("#signup-lastName").val()
                };
                const dataCompany = {
                    Name: 'custom:company',
                    Value: $("#signup-company").val()
                };

                const attributeFirstName = new AmazonCognitoIdentity.CognitoUserAttribute(dataGivenName);
                const attributeFamilyName = new AmazonCognitoIdentity.CognitoUserAttribute(dataFamilyName);
                const attributeCompany = new AmazonCognitoIdentity.CognitoUserAttribute(dataCompany);

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
            if (checkVerifyForm()) {
                var code = $("#verify-code").val();
                loadingWait(true);
                cognitoUser.confirmRegistration(code, true, function (err, result) {
                    loadingWait(false);
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
                });
            }
        });

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
                loadingWait(true);
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
                .then(function (res) {
                    if (res.status !== 0) {
                        handleException(res.error);
                    } else {
                        getCluster();
                    }
                })
                .finally(() => loadingWait(false));
            }
        });

        $("#forgotSection a").click(function () {
            $("#loginForm").hide();
            $("#loginTitle").hide();
            $("#forgotPasswordForm").show();
            $("#forgotPasswordTitle").show();
        });

        $("#forgot-password-submit").click(function () {
            if (checkForgotPasswordForm()) {
                var userData = {
                    Username: $("#forgot-password-email").val(),
                    Pool: userPool
                };
                cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

                loadingWait(true);
                cognitoUser.forgotPassword({
                    onSuccess: function () {
                        loadingWait(false);
                        $("#forgotPasswordFormError").hide();
                        $("#forgotPasswordForm").hide();
                        $("#forgotPasswordTitle").hide();
                        $("#confirmForgotPasswordForm").show();
                        $("#confirmForgotPasswordTitle").show();
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        showFormError($("#forgotPasswordFormError"), err.message);
                    }
                });
            }
        });

        $("#confirm-forgot-password-submit").click(function () {
            if (checkConfirmForgotPasswordForm()) {
                var verificationCode = $("#confirm-forgot-password-code").val();
                var newPassword = $("#confirm-forgot-password-new-password").val();
                loadingWait(true);
                cognitoUser.confirmPassword(verificationCode, newPassword, {
                    onSuccess: function () {
                        loadingWait(false);
                        $("#confirmForgotPasswordFormError").hide();
                        $("#confirmForgotPasswordForm").hide();
                        $("#confirmForgotPasswordTitle").hide();
                        $("#loginForm").show();
                        $("#loginTitle").show();
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        showFormError($("#confirmForgotPasswordFormError"), err.message);
                    }
                });
            }
        });
    }
}