interface ClusterGetResponse {
    status: number,
    isPending?: string
    error?: string,
    clusterUrl?: string
}

namespace CloudLogin {
    let userPoolId: string;
    let clientId: string;
    let cookieAuthApiUrl: string;
    let mainApiUrl: string;
    let userPool;
    let cognitoUser;

    let localUsername: string;
    let localSessionId: string;
    let selectedClusterSize: string;
    let deployingProgressBar: ProgressBar;
    let stoppingProgressBar: ProgressBar;
    let loginTimeoutTimer: number;

    export function setup(): void {
        userPoolId = XCE_CLOUD_USER_POOL_ID;
        clientId = XCE_CLOUD_CLIENT_ID;
        cookieAuthApiUrl = XCE_SAAS_AUTH_LAMBDA_URL;
        mainApiUrl = XCE_SAAS_MAIN_LAMBDA_URL;
        const poolData = {
            UserPoolId: userPoolId,
            ClientId: clientId
        };
        userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        let forceLogout = checkForceLogout();
        initialStatusCheck(forceLogout);
        handleEvents();

        deployingProgressBar = new ProgressBar({
            $container: $("#loadingForm"),
            completionTime: 100,
            progressTexts: [
                'Creating Xcalar cluster',
                'Starting Xcalar cluster',
                'Initializing Xcalar cluster',
                'Setting up user preferences',
                'Running health checks'
            ],
            numVisibleProgressTexts: 5,
            startWidth: parseInt(sessionStorage.getItem('XcalarDeployingProgressBarWidth')) || 5,
            firstTextId: parseInt(sessionStorage.getItem('XcalarDeployingProgressBarFirstTextId')) || 0
        });

        stoppingProgressBar = new ProgressBar({
            $container: $("#stoppingForm"),
            completionTime: 25,
            progressTexts: [
                'Stopping Xcalar cluster'
            ],
            numVisibleProgressTexts: 1,
            startWidth: parseInt(sessionStorage.getItem('XcalarStoppingProgressBarWidth')) || 5,
            firstTextId: parseInt(sessionStorage.getItem('XcalarStoppingProgressBarFirstTextId')) || 0
        });
    }

    function initialStatusCheck(forceLogout?: boolean): void {
        sendRequest({
            apiUrl: cookieAuthApiUrl,
            action: "/status",
            fetchParams: {
                credentials: 'include',
            }
        })
        .then((response) => {
            if (forceLogout) {
                if (response.loggedIn) {
                    cookieLogout();
                }
                logoutAndShowInitialScreens();
            } else if (response.loggedIn === true) {
                localUsername = response.emailAddress;
                localSessionId = response.sessionId;
                clusterSelection();
                loginMixpanel.setUsername(localUsername);
            } else if (response.loggedIn === false) {
                logoutAndShowInitialScreens();
            } else {
                xcConsoleError('cookieLoggedInStatus unrecognized code:', response);
                logoutAndShowInitialScreens();
            }
        })
        .fail((error) => {
            xcConsoleError('cookieLoggedInStatus error:', error);
            // handle it as a not logged in case
            logoutAndShowInitialScreens();
        });
    }

    function logoutAndShowInitialScreens(): void {
        localUsername = "";
        localSessionId = "";
        showInitialScreens();
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
            xcConsoleError('cookieLogin error:', error);
            if (error.code === "UserNotConfirmedException") {
                $("#loginFormMessage").hide();
                showScreen("verify");
                ensureCognitoUserExists();
                cognitoResendConfirmationCode();
            } else {
                let errorMsg = getErrorMessage(error, "Login failed with unknown error.");
                errorMsg += errorMsg.endsWith('.') ? '' : '.';
                errorMsg += " Please try again.";
                showFormError($("#loginFormMessage"), errorMsg);
            }
        })
        .always(() => loadingWait(false));
    }

    function cookieLogout(): void {
        sendRequest({
            apiUrl: cookieAuthApiUrl,
            action: "/logout",
            fetchParams: {
                credentials: 'include',
            }
        })
        .fail(error => {
            xcConsoleError('cookieLogut error:', error);
        });
    }

    function checkCredit(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            loadingWait(true);
            sendRequest({
                apiUrl: mainApiUrl,
                action: "/billing/get",
                fetchParams: {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        "username": localUsername
                    }),
                }
            })
            .then((billingGetResponse) => {
                if (billingGetResponse.status === ClusterLambdaApiStatusCode.OK) {
                    if (billingGetResponse.credits > 0) {
                        resolve(true);
                    } else {
                        showScreen("noCredits");
                        resolve(false);
                    }
                } else {
                    xcConsoleError('checkCredit non-zero status:', billingGetResponse.error);
                    handleException(billingGetResponse.error);
                    reject(billingGetResponse.error);
                }
            })
            .fail((error) => {
                if (error.status === ClusterLambdaApiStatusCode.NO_CREDIT_HISTORY) {
                    // first time user should start with some credits
                    resolve(true);
                } else {
                    xcConsoleError('checkCredit error caught:', error);
                    handleException(error);
                    reject(error);
                }
            })
            .always(() => loadingWait(false));
        });
    }

    function showProgressBar(isStarting) {
        if (isStarting) {
            showScreen("loading");
            deployingClusterAnimation();
        } else {
            showScreen("stopping");
            stoppingClusterAnimation();
        }
    }


    function getCluster(clusterIsStarting?: boolean): XDPromise<void> {
        loadingWait(true);
        return sendRequest({
            apiUrl: mainApiUrl,
            action: "/cluster/get",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": localUsername
                }),
            }
        })
        .then((clusterGetResponse) => {
            if (clusterGetResponse.status !== ClusterLambdaApiStatusCode.OK) {
                // error
                xcConsoleError('getCluster error. cluster/get returned: ', clusterGetResponse);
                // XXX TODO: remove this hack fix when lambda fix it
                if (clusterGetResponse.status === ClusterLambdaApiStatusCode.CLUSTER_ERROR &&
                    clusterGetResponse.error === "Cluster is not reachable yet"
                ) {
                    console.warn(clusterGetResponse);
                    setTimeout(() => getCluster(clusterGetResponse.isStarting), 3000);
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
                    showScreen("cluster");
                    clearTimeout(loginTimeoutTimer);
                    loginTimeoutTimer = <any>setTimeout(() => {
                        showInitialScreens();
                        cookieLogout();
                    }, 1800000);
                }
            } else if (clusterGetResponse.isPending) {
                // go to wait screen
                setTimeout(() => getCluster(clusterGetResponse.isStarting), 3000);
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
            xcConsoleError('getCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    function startCluster(): void {
        loadingWait(true);
        sendRequest({
            apiUrl: mainApiUrl,
            action: "/cluster/start",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
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
            xcConsoleError('startCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    function clusterSelection() {
        checkCredit()
        .then((hasCredit) => {
            if (hasCredit) {
                return getCluster();
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
            xcConsoleError(e);
            handleException(null);
        }
    }

    function hideCurrentScreen(): void {
        $("#cloudLoginHeader").children().hide();
        $("#formArea").children().hide();
    }

    function showScreen(screenName: string): void {
        hideCurrentScreen();
        $("#" + screenName + "Title").show();
        $("#" + screenName + "Form").show();
    }

    function showInitialScreens(): void {
        const signupScreen: boolean = hasParamInURL("signup");
        if (signupScreen) {
            showScreen("signup");
        } else {
            showScreen("login");
        }
    }

    function getErrorMessage(error: any, defaultMsg: string = "unknown error") {
        if (typeof error === "object" && (error.message || error.error)) {
            error = error.message || error.error;
        } else if (typeof error !== 'string' && !(error instanceof String)) {
            error = defaultMsg;
        }
        return error;
    }

    function showExceptionScreen(
        errorMsg: string = "An unknown error has occurred...",
        displayText: string = "To try again, refresh this page, or contact Xcalar support at (408) 471-1711"
    ): void {
        $("#exceptionForm #exceptionFormMessage .text").html(errorMsg);
        $("#exceptionForm .title").html(displayText);

        showScreen("exception");
    }

    function handleException(error: any): void {
        const errorMsg = getErrorMessage(error, "An unknown server error has ocurred.");
        if (error.status === ClusterLambdaApiStatusCode.NO_AVAILABLE_STACK) {
            let displayText =
            'We are currently experiencing an overwhelmingly high demand for our product. ' +
            'Please contact Xcalar support at <a href="mailto:info@xcalar.com">info@xcalar.com</a> ' +
            'or call us at (408) 471-1711. Thank you for your patience.'
            showExceptionScreen(errorMsg, displayText);
        } else {
            showExceptionScreen(errorMsg);
        }

        cookieLogout();
    }

    function checkLoginForm(): boolean {
        const email: string = $("#loginNameBox").val();
        const password: string = $("#loginPasswordBox").val();
        if (!email || !password) {
            showFormError($("#loginFormMessage"), "Fields missing or incomplete.");
            return false;
        } else if (!validateEmail(email) || !validatePassword(password)) {
            showFormError($("#loginFormMessage"), "Wrong Email or Password. Please try again.");
            return false;
        } else {
            $("#loginFormMessage").hide();
            return true;
        }
    }

    function showFormError($errorBox: JQuery, errorText: string): void {
        const $icon = $errorBox.find('.icon');
        $icon.removeClass('xi-success');
        $icon.addClass('xi-error');
        $errorBox.children(".text").html(errorText);
        $errorBox.show();
    }

    function showFormSuccess($successBox: JQuery, successText: string): void {
        const $icon = $successBox.find('.icon');
        $icon.removeClass('xi-error');
        $icon.addClass('xi-success');
        $successBox.children(".text").html(successText);
        $successBox.show();
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

    function showTooltipOnFocus($element: JQuery, error: boolean) {
        const $tooltip = $element.find(".input-tooltip");

        $element.unbind('focusin focusout');

        $element.focusin(
            function () {
                if (error) {
                    $tooltip.show();
                    focusTooltipShown = true;
                } else {
                    $tooltip.hide();
                    focusTooltipShown = false;
                }
            }
        )
        $element.focusout(
            function () {
                $tooltip.hide();
                focusTooltipShown = false;
            }
        )
        if ($element.find('input').is(":focus")) {
            if (error) {
                $tooltip.show();
                focusTooltipShown = true;
            } else {
                $tooltip.hide();
                focusTooltipShown = false;
            }
        }
    }

    function showInputError($element: JQuery, inputIsCorrect: boolean, showSuccessIcon: boolean): void {
        const $icon = $element.find('.icon').not(".input-tooltip .icon");

        $element.unbind('mouseenter mouseleave');

        if (inputIsCorrect) {
            showTooltipOnFocus($element, false);

            if (showSuccessIcon) {
                $icon.removeClass('xi-error');
                $icon.addClass('xi-success');
                $icon.show();
            } else {
                $icon.hide();
            }
        } else {
            if (signupSubmitClicked) {
                showTooltipOnFocus($element, true);
                $element.hover(() => showTooltip($element), () => hideTooltip($element));
                $icon.removeClass('xi-success');
                $icon.addClass('xi-error');
                $icon.show();
            } else {
                $icon.hide();
            }
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
        const specialCharacters: RegExp = /(\W|_)/g;
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

        showInputError($("#firstNameSection"), !firstNameEmpty, false);
        showInputError($("#lastNameSection"), !lastNameEmpty, false);
        showInputError($("#companySection"), !companyEmpty, false);
        showInputError($("#emailSection"), validateEmail(email1), true);
        showInputError($("#confirmEmailSection"), emailsMatch && validateEmail(email1), true);
        showInputError($("#passwordSection"), validatePassword(password1), true);
        showInputError($("#confirmPasswordSection"), passwordsMatch && validatePassword(password1), true);
        showInputError($(".submitSection"), checkedEULA, false);

        showPasswordErrorRows(password1);

        showTooltipOnFocus($("#passwordSection"), !validatePassword(password1));

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
            $("#signupFormMessage").hide()
            return true;
        } else {
            if (signupSubmitClicked) {
                if (inputIsCorrect && !checkedEULA) {
                    showFormError($("#signupFormMessage"), "Please read and accept the End User License Agreement");
                } else {
                    showFormError($("#signupFormMessage"), "Fields missing or incomplete.");
                }
            }
            return false;
        }
    }

    let loadingWaitIntervalID: number;
    let buttonsLoadingDisabled: boolean = false;
    let fetchesInProgress: number = 0;

    function loadingWait(waitFlag: boolean): void {
        fetchesInProgress += waitFlag ? 1 : -1;
        if (fetchesInProgress > 0 && !buttonsLoadingDisabled) {
            $('.auth-section').addClass('auth-link-disabled');
            $('.btn').addClass('btn-disabled');
            $('.btn').append('<span class="loading-dots"></span>')
            let dotsCount: number = 0
            loadingWaitIntervalID = <any>setInterval(function() {
                dotsCount = (dotsCount + 1) % 4;
                $('.btn .loading-dots').text('.'.repeat(dotsCount));
            }, 1000);
            buttonsLoadingDisabled = true;
        } else if (fetchesInProgress < 1) {
            $('.auth-section').removeClass('auth-link-disabled');
            $('.btn').removeClass('btn-disabled');
            $('.btn .loading-dots').remove();
            clearInterval(loadingWaitIntervalID);
            buttonsLoadingDisabled = false;
        }
    }

    function checkVerifyForm(): boolean {
        const code: string = $("#verify-code").val();
        if (!code) {
            showFormError($("#verifyFormMessage"), "Please enter your verification code.");
            return false;
        } else {
            $("#verifyFormMessage").hide();
            return true;
        }
    }

    function checkForgotPasswordForm(): boolean {
        let forgotPasswordEmail: string = $("#forgot-password-email").val()
        if (forgotPasswordEmail && validateEmail(forgotPasswordEmail)) {
            $("#forgotPasswordFormMessage").hide();
            return true;
        } else {
            showFormError($("#forgotPasswordFormMessage"), "Please enter a valid email for password recovery.");
            return false;
        }
    }

    function checkClusterForm(): boolean {
        if (!selectedClusterSize) {
            showFormError($("#clusterFormMessage"), "Please select your cluster size.");
            return false;
        } else {
            $("#clusterFormMessage").hide();
            return true;
        }
    }

    function checkConfirmForgotPasswordForm(): boolean {
        const verificationCode: string = $("#confirm-forgot-password-code").val();
        const newPassword1: string = $("#confirm-forgot-password-new-password").val();
        const newPassword2: string = $("#confirm-forgot-password-confirm-new-password").val();
        if (verificationCode && newPassword1 && validatePassword(newPassword1) && newPassword1 === newPassword2) {
            $("#confirmForgotPasswordFormMessage").hide();
            return true;
        } else {
            showFormError(
                $("#confirmForgotPasswordFormMessage"),
                "Please fill all fields correctly to reset password. New password must contain lowercase, " +
                "uppercase, number, a special character, and must be at least 8 characters long. "
            );
            return false;
        }
    }

    function showClusterIsReadyScreen(): void {
        $("#loadingTitle").html("Your cluster is ready!");
        deployingProgressBar.end("Redirecting to Xcalar Cloud...");
        clearInterval(deployingProgressBarCheckIntervalID);
        sessionStorage.setItem('XcalarDeployingProgressBarWidth', "");
        sessionStorage.setItem('XcalarDeployingProgressBarFirstTextId', "");
    }

    let deployingProgressBarCheckIntervalID: number;

    function deployingClusterAnimation(): void {
        if (!deployingProgressBar.isStarted()) {
            deployingProgressBar.start("Please wait while your cluster loads...");

            clearInterval(deployingProgressBarCheckIntervalID);
            deployingProgressBarCheckIntervalID = <any>setInterval(function() {
                const {width, firstTextId} = deployingProgressBar.getProgress();
                sessionStorage.setItem('XcalarDeployingProgressBarWidth', String(width - 1));
                sessionStorage.setItem('XcalarDeployingProgressBarFirstTextId', String(firstTextId - 1));
            }, 1000);
        }
    }

    let stoppingProgressBarCheckIntervalID: number;

    function showClusterIsStoppedScreen(): void {
        $("#stoppingTitle").html("Your cluster has been shut down!");
        stoppingProgressBar.end("Redirecting to the login page...");
        clearInterval(stoppingProgressBarCheckIntervalID);
        sessionStorage.setItem('XcalarStoppingProgressBarWidth', "");
        sessionStorage.setItem('XcalarStoppingProgressBarFirstTextId', "");
    }

    function stoppingClusterAnimation(): void {
        if (!stoppingProgressBar.isStarted()) {
            stoppingProgressBar.start("Please wait while your cluster stops...");

            clearInterval(stoppingProgressBarCheckIntervalID);
            stoppingProgressBarCheckIntervalID = <any>setInterval(function() {
                const {width, firstTextId} = stoppingProgressBar.getProgress();
                sessionStorage.setItem('XcalarStoppingProgressBarWidth', String(width - 1));
                sessionStorage.setItem('XcalarStoppingProgressBarFirstTextId', String(firstTextId - 1));
            }, 1000);
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
            return res.json();
        })
        .then((res: any) => {
            // XXX TODO: use a enum instead of 0
            if (statusCode === httpStatus.OK && (!res.status || res.status === ClusterLambdaApiStatusCode.OK)) {
                deferred.resolve(res);
            // TODO: remove this else if after /login returns object - not stringified object
            } else if (statusCode === httpStatus.Unauthorized && res.code !== "UserNotConfirmedException") {
                deferred.reject('Wrong Email or Password.');
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
            ["#loginFormMessage"],
            ["#loginNameBox","#loginPasswordBox"]
        );
        clearElements(
            [".already-have-account"],
            ["#signupFormMessage"],
            ["#loginNameBox", "#loginPasswordBox"]
        );
        clearElements(
            ["#forgotSection a", ".signupSection a"],
            ["#loginFormMessage"],
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
            ["#forgotPasswordFormMessage"],
            ["#forgot-password-email"]
        );
        clearElements(
            [".already-have-account"],
            ["#confirmForgotPasswordFormMessage"],
            [
                "#confirm-forgot-password-code",
                "#confirm-forgot-password-new-password",
                "#confirm-forgot-password-confirm-new-password"
            ]
        );
        clearElements(
            [".link-to-login"],
            ["#clusterFormMessage"],
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
        loadingWait(true);
        cognitoUser.resendConfirmationCode(function (err, result) {
            loadingWait(false);
            if (err) {
                xcConsoleError(err);
                showFormError($("#verifyFormMessage"), err.message);
                return;
            }
        });
    }

    function hasParamInURL(param): boolean {
        return new URLSearchParams(window.location.search).has(param);
    }

    function checkForceLogout(): boolean {
        let forceLogout = hasParamInURL("logout");
        if (forceLogout) {
            // don't show logout as part of the URL
            clearURL();
        }
        return forceLogout;
    }

    function clearURL(): void {
        window.history.pushState({}, document.title, "/");
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
            showScreen("login");
        });

        $(".logOutLink").click(function () {
            clearTimeout(loginTimeoutTimer);
            cookieLogout();
        });

        $("#loginButton").click(function () {
            if (checkLoginForm()) {
                var username = $("#loginNameBox").val().toLowerCase();
                var password = $("#loginPasswordBox").val();
                cookieLogin(username, password);
            }
        });

        $("#verify-resend-code").click(function () {
            cognitoResendConfirmationCode();
            showFormSuccess(
                $("#verifyFormMessage"),
                "An email verification code has been sent to your email address. Enter it below to confirm your account"
            );
        });

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
                        xcConsoleError(err);
                        showFormError($("#signupFormMessage"), err.message);
                        return;
                    } else {
                        $("#verifyFormMessage").hide();
                    }
                    cognitoUser = result.user;

                    showScreen("verify");
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
                        xcConsoleError(err);
                        showFormError($("#verifyFormMessage"), err.message);
                        return;
                    } else {
                        $("#verifyFormMessage").hide();
                        showScreen("login");
                        showFormSuccess($("#loginFormMessage"), "Your email address was verified successfully. Log in to access your account!");
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
                clearTimeout(loginTimeoutTimer);
                startCluster();
            }
        });

        $("#forgotSection a").click(function () {
            showScreen("forgotPassword");
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
                        $("#forgotPasswordFormMessage").hide();
                        showScreen("confirmForgotPassword");
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        if (err.code === 'UserNotFoundException') {
                            showFormError($("#forgotPasswordFormMessage"), "Account doesn't exist.");
                        } else {
                            showFormError($("#forgotPasswordFormMessage"), err.message);
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
                        $("#confirmForgotPasswordFormMessage").hide();
                        showScreen("login");
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        showFormError($("#confirmForgotPasswordFormMessage"), err.message);
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
            startCluster: startCluster,
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
