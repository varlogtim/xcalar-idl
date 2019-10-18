interface ClusterGetResponse {
    status: number,
    isPending?: string
    error?: string,
    clusterUrl?: string
}

namespace CloudLogin {
    const cookieAuthApiUrl: string = "https://605qwok4pl.execute-api.us-west-2.amazonaws.com/prod";
    const clusterLambdaApiUrl: string = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod"

    const userPoolId: string = "us-west-2_Eg94nXgA5";
    const clientId: string = "69vk7brpkgcii8noqqsuv2dvbt";
    const poolData = {
        UserPoolId: userPoolId,
        ClientId: clientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    let cognitoUser;

    let localUsername: string;
    let localSessionId: string;
    let selectedClusterSize: string;
    let deployingProgressBar: ProgressBar;
    let stoppingProgressBar: ProgressBar;

    export function setup(): void {
        initialStatusCheck();
        handleEvents();

        deployingProgressBar = new ProgressBar({
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

        stoppingProgressBar = new ProgressBar({
            $container: $("#stoppingForm"),
            completionTime: 25,
            progressTexts: [
                'Stopping Xcalar cluster'
            ],
            numVisibleProgressTexts: 1
        });
    }

    function initialStatusCheck(): void {
        sendRequest({
            apiUrl: cookieAuthApiUrl,
            action: "/status",
            fetchParams: {
                credentials: 'include',
            }
        })
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
        }).fail(error => {
            console.error('cookieLoggedInStatus error:', error);
            // handle it as a not logged in case
            showInitialScreens();
        });
    }

    function cookieLogin(username: string, password: string): void {
        localUsername = username;
        loadingWait(true);
        sendRequest({
            apiUrl: cookieAuthApiUrl,
            action: "/login",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": username,
                    "password": password
                })
            }
        })
        .then((res) => {
            localSessionId = res.sessionId;
            clusterSelection();
        })
        .fail((error) => {
            console.error('cookieLogin error:', error);
            if (error.code === "UserNotConfirmedException") {
                $("#loginFormError").hide();
                $("header").children().hide();
                $("#formArea").children().hide();
                $("#verifyForm").show();
                $("#verifyTitle").show();
                ensureCognitoUserExists();
                cognitoResendConfirmationCode();
            } else {
                if (typeof error === "object" && error.message) {
                    error = error.message;
                } else if (typeof error !== "string") {
                    error = "Login failed with unknown error.";
                }
                error += error.endsWith('.') ? '' : '.';
                error += " Please try again.";
                showFormError($("#loginFormError"), error);
            }
        })
        .always(() => loadingWait(false));
    }

    function cookieLogout(handleExceptionFlag: boolean): void {
        loadingWait(true);
        sendRequest({
            apiUrl: cookieAuthApiUrl,
            action: "/logout",
            fetchParams: {
                credentials: 'include',
            }
        })
        .fail(error => {
            console.error('cookieLogut error:', error);
            if (handleExceptionFlag) {
                handleException(error);
            }
        })
        .always(() => loadingWait(false));
    }

    function checkCredit(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            loadingWait(true);
            sendRequest({
                apiUrl: clusterLambdaApiUrl,
                action: "/billing/get",
                fetchParams: {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: 'POST',
                    body: JSON.stringify({
                        "username": localUsername
                    }),
                }
            })
            .then((billingGetResponse) => {
                if (billingGetResponse.status === 0) {
                    if (billingGetResponse.credits > 0) {
                        resolve(true);
                    } else {
                        $("header").children().hide()
                        $("#formArea").children().hide()
                        $('#noCreditsForm').show();
                        $('#noCreditsTitle').show();
                        resolve(false);
                    }
                } else {
                    console.error('checkCredit non-zero status:', billingGetResponse.error);
                    handleException(billingGetResponse.error);
                    reject(billingGetResponse.error);
                }
            })
            .fail((error) => {
                if (error.status === 1) {
                    // first time user should start with some credits
                    resolve(true);
                } else {
                    console.error('checkCredit error caught:', error);
                    handleException(error);
                    reject(error);
                }
            })
            .always(() => loadingWait(false));
        });
    }

    function showProgressBar(isStarting) {
        if (isStarting) {
            $("#loadingTitle").show();
            $("#loadingForm").show();
            deployingClusterAnimation();
        } else {
            $("#stoppingTitle").show();
            $("#stoppingForm").show();
            stoppingClusterAnimation();
        }
    }


    function getCluster(clusterIsStarting?: boolean): XDPromise<void> {
        loadingWait(true);
        return sendRequest({
            apiUrl: clusterLambdaApiUrl,
            action: "/cluster/get",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                body: JSON.stringify({
                    "username": localUsername
                }),
            }
        })
        .then((clusterGetResponse) => {
            if (clusterGetResponse.status !== 0) {
                // error
                console.error('getCluster error. cluster/get returned: ', clusterGetResponse);
                // XXX TODO: remove this hack fix when lambda fix it
                if (clusterGetResponse.status === 8 &&
                    clusterGetResponse.error === "Cluster is not reachable yet"
                ) {
                    console.warn(clusterGetResponse);
                    setTimeout(() => getCluster(clusterGetResponse.isStarting), 3000);
                    $("header").children().hide();
                    $("#formArea").children().hide();
                    showProgressBar(clusterGetResponse.isStarting);
                    return;
                } else {
                    handleException(clusterGetResponse.error);
                }
            } else if (clusterGetResponse.isPending === false && clusterGetResponse.clusterUrl === undefined) {
                // go to cluster selection screen

                if (clusterIsStarting === false) {
                    showClusterIsStoppedScreen();
                    setTimeout(() => {
                        showInitialScreens();
                    }, 1000);
                } else {
                    $("header").children().hide();
                    $("#formArea").children().hide();
                    $("#clusterTitle").show();
                    $("#clusterForm").show();
                }
            } else if (clusterGetResponse.isPending) {
                // go to wait screen
                setTimeout(() => getCluster(clusterGetResponse.isStarting), 3000);
                $("header").children().hide();
                $("#formArea").children().hide();
                showProgressBar(clusterGetResponse.isStarting);
            } else {
                let cb = () => {
                    // redirect to cluster
                    if (deployingProgressBar.isStarted()) {
                        showClusterIsReadyScreen();
                        setTimeout(() => {
                            goToXcalar(clusterGetResponse);
                        }, 1000);
                    } else {
                        goToXcalar(clusterGetResponse);
                    }
                };
                checkExpServerIsUp(clusterGetResponse.clusterUrl, cb, 0);
            }
        })
        .fail((error) => {
            console.error('getCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    function startCluster(): void {
        loadingWait(true);
        sendRequest({
            apiUrl: clusterLambdaApiUrl,
            action: "/cluster/start",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                body: JSON.stringify({
                    "username": localUsername,
                    "clusterParams": {
                        "type": selectedClusterSize
                    }
                })
            }
        })
        .then((clusterStartResponse) => {
            getCluster();
        })
        .fail((error) => {
            console.error('startCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    // function clusterSelection(cb?: Function) {
    function clusterSelection() {
        checkCredit()
        .then((hasCredit) => {
            if (hasCredit) {
                return getCluster();
            }
        // })
        // .finally(() => {
        //     if (typeof cb === "function") {
        //         cb();
        //     }
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

    // XXX TODO: this should be done on lambda side
    function checkExpServerIsUp(url, cb, cnt): void {
        try {
            let checkcer = () => {
                fetch(url + "/app/service/getTime")
                .then((res) => res.json())
                .then(() => {
                    // succeed
                    console.log("server is up!");
                    cb();
                })
                .catch(() => {
                    if (cnt > 20) {
                        handleException("Server is unresponsive");
                    } else {
                        checkExpServerIsUp(url, cb, cnt + 1);
                    }
                })
            }
    
            let time = (cnt) * 1000; // 5s scale check
            setTimeout(() => {
                console.log("wait for", time, "to check server is up");
                checkcer();
            }, time);
        } catch (e) {
            console.error(e);
            handleException(null);
        }
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
            showFormError($("#loginFormError"), "Wrong Email or Password. Please try again.");
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
        return password.match(/(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*(\W|_))/)
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

    function showInputError($element: JQuery, hideErrorCondition: boolean, signupSubmitClicked: boolean): void {
        if (!signupSubmitClicked || hideErrorCondition) {
            $element.find('.icon.xi-error').hide();
            $element.find('.input-tooltip').hide();
            $element.focusin(
                function () {
                    $(this).find(".input-tooltip").hide();
                    focusTooltipShown = false;
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

        showInputError($("#firstNameSection"), !firstNameEmpty, signupSubmitClicked);
        showInputError($("#lastNameSection"), !lastNameEmpty, signupSubmitClicked);
        showInputError($("#companySection"), !companyEmpty, signupSubmitClicked);
        showInputError($("#emailSection"), validateEmail(email1), signupSubmitClicked);
        showInputError($("#confirmEmailSection"), emailsMatch && validateEmail(email1), signupSubmitClicked);
        showInputError($("#passwordSection"), validatePassword(password1), signupSubmitClicked);
        showInputError($("#confirmPasswordSection"), passwordsMatch && validatePassword(password1), signupSubmitClicked);
        showInputError($(".submitSection"), checkedEULA, signupSubmitClicked);

        showPasswordErrorRows(password1);

        if (email1 === "") {
            $('#emailSection .input-tooltip').text('Email cannot be empty');
        } else {
            $('#emailSection .input-tooltip').text('Email must be in a valid format');
        }

        $(".tooltipRow i").removeClass("xi-cancel");
        $(".tooltipRow i").addClass("xi-success");
        $(".errorTooltipRow i").removeClass("xi-success");
        $(".errorTooltipRow i").addClass("xi-cancel");

        const inputIsCorrect: boolean = !firstNameEmpty &&
            !lastNameEmpty &&
            !companyEmpty &&
            validateEmail(email1) &&
            emailsMatch &&
            validatePassword(password1) &&
            passwordsMatch;

        if (inputIsCorrect && checkedEULA) {
            $("#signupFormError").hide()
            return true;
        } else {
            if (signupSubmitClicked) {
                if (inputIsCorrect && !checkedEULA) {
                    showFormError($("#signupFormError"), "Please read and accept the End User License Agreement");
                } else {
                    showFormError($("#signupFormError"), "Fields missing or incomplete.");
                }
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
        deployingProgressBar.end("Redirecting to Xcalar Cloud...")
    }

    function deployingClusterAnimation(): void {
        if (!deployingProgressBar.isStarted()) {
            deployingProgressBar.start("Please wait while your cluster loads...");
        }
    }

    function showClusterIsStoppedScreen(): void {
        $("#stoppingTitle").html("Your cluster has been shut down!");
        stoppingProgressBar.end("Redirecting to the login page...")
    }

    function stoppingClusterAnimation(): void {
        if (!stoppingProgressBar.isStarted()) {
            stoppingProgressBar.start("Please wait while your cluster stops...");
        }
    }

    function submitOnEnterPress($form: JQuery, $submitButton: JQuery): void {
        $form.keypress(function(event) {
            const keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == 13) {
                $submitButton.click();
            }
        });
    }

    function sendRequest({apiUrl, action, fetchParams}: {apiUrl: string, action: string, fetchParams: object}): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const url: string = `${apiUrl}${action}`;
        let statusCode: number;
        fetch(url, fetchParams)
        .then((res) => {
            statusCode = res.status;
            if (res.status === httpStatus.OK || res.status === httpStatus.Unauthorized) {
                return res.json();
            } else {
                return PromiseHelper.reject('Server responsed with status ' + res.status + '.');
            }
        })
        .then((res: any) => {
            // XXX TODO: use a enum instead of 0
            if (statusCode === httpStatus.Unauthorized) {
                if (res.code === "UserNotConfirmedException") {
                    deferred.reject(res);
                } else {
                    deferred.reject('Wrong Email or Password.');
                }
            } else if (!res.status || res.status === 0) {
                deferred.resolve(res);
            } else {
                deferred.reject(res);
            }
        })
        .catch((e) => {
            deferred.reject(e);
        });

        return deferred.promise();
    }

    function clearElements(elementsToTrigger: string[], elementsToHide: string[], elementsToEmpty: string[], clearFunction?: Function): void {
        elementsToTrigger.forEach((elementToTrigger) => $(elementToTrigger).click(function () {
            elementsToHide.forEach((element) => $(element).hide());
            elementsToEmpty.forEach((element) => $(element).val(""));
            if (typeof clearFunction === 'function') {
                clearFunction();
            }
        }));
    }

    function clearForms() {
        clearElements(
            ["#forgotSection a", ".signupSection a"],
            ["#loginFormError"],
            ["#loginNameBox","#loginPasswordBox"]
        );
        clearElements(
            [".already-have-account"],
            ["#signupFormError"],
            ["#loginNameBox", "#loginPasswordBox"]
        );
        clearElements(
            ["#forgotSection a", ".signupSection a"],
            ["#loginFormError"],
            [
                "#signup-firstName",
                "#signup-lastName",
                "#signup-company",
                "#signup-email",
                "#signup-confirmEmail",
                "#signup-password",
                "#signup-confirmPassword"
            ],
            () => {
                $("#signup-termCheck").prop("checked",false);
                signupSubmitClicked = false;
                checkSignUpForm();
            }
        );
        clearElements(
            [".already-have-account"],
            ["#forgotPasswordFormError"],
            ["#forgot-password-email"]
        );
        clearElements(
            [".already-have-account"],
            ["#confirmForgotPasswordFormError"],
            [
                "#confirm-forgot-password-code",
                "#confirm-forgot-password-new-password",
                "#confirm-forgot-password-confirm-new-password"
            ]
        );
        clearElements(
            [".link-to-login"],
            ["#clusterFormError"],
            []
        );
    }

    function ensureCognitoUserExists() {
        if (!cognitoUser) {
            var userData = {
                Username: localUsername,
                Pool: userPool
            };
            cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        }
    }

    function cognitoResendConfirmationCode() {
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

        submitOnEnterPress($("#signupForm"), $("#signup-submit"));
        submitOnEnterPress($("#loginForm"), $("#loginButton"));
        submitOnEnterPress($("#verifyForm"), $("#verify-submit"));
        submitOnEnterPress($("#forgotPasswordForm"), $("#forgot-password-submit"));
        submitOnEnterPress($("#confirmForgotPasswordForm"), $("#confirm-forgot-password-submit"));

        $(".signup-login").click(function () {
            $("#signupForm").toggle();
            $("#loginForm").toggle();
            $("#loginTitle").toggle();
            $("#signupTitle").toggle();
        })

        clearForms();

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
                var username = $("#loginNameBox").val().toLowerCase();
                var password = $("#loginPasswordBox").val();
                cookieLogin(username, password);
            }
        });

        $("#resend-code").click(function () {
            loadingWait(true);
            cognitoResendConfirmationCode();
        })

        $("#signup-submit").click(function () {
            if (checkSignUpForm()) {
                const username = $("#signup-email").val().toLowerCase();
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
                startCluster();
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
                    Username: $("#forgot-password-email").val().toLowerCase(),
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
                        if (err.code === 'UserNotFoundException') {
                            showFormError($("#forgotPasswordFormError"), "Account doesn't exist.");
                        } else {
                            showFormError($("#forgotPasswordFormError"), err.message);
                        }
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
    /* Unit Test Only */
    if (window["unitTestMode"]) {
        CloudLogin["__testOnly__"] = {
            initialStatusCheck: initialStatusCheck,
            cookieLogin: cookieLogin,
            cookieLogout: cookieLogout,
            checkCredit: checkCredit,
            getCluster: getCluster,
            clusterSelection: clusterSelection,
            goToXcalar: goToXcalar,
            showInitialScreens: showInitialScreens,
            handleException: handleException,
            checkLoginForm: checkLoginForm,
            showFormError: showFormError,
            validateEmail: validateEmail,
            validatePassword: validatePassword,
            hideTooltip: hideTooltip,
            showTooltip: showTooltip,
            showInputError: showInputError,
            showPasswordErrorRows: showPasswordErrorRows,
            checkSignUpForm: checkSignUpForm,
            loadingWait: loadingWait,
            checkVerifyForm: checkVerifyForm,
            checkForgotPasswordForm: checkForgotPasswordForm,
            checkClusterForm: checkClusterForm,
            checkConfirmForgotPasswordForm: checkConfirmForgotPasswordForm,
            showClusterIsReadyScreen: showClusterIsReadyScreen,
            deployingClusterAnimation: deployingClusterAnimation,
            handleEvents: handleEvents
        }
    }
    /* End Of Unit Test Only */
}
