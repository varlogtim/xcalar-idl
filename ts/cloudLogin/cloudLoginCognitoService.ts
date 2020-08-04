/**
 * CloudLoginCognitoService defines AWS Cognito calls
 * to be used by CloudLogin browser page
 *
 * Cognito methods, don't make calls to any lambdas.
 * These methods include methods for user management,
 * such as cognitoSignUp and cognitoForgotPassword
 */
class CloudLoginCognitoService {
    private _userPool;
    private _cognitoUser;

    /**
     * Initializes AWS Cognito user pool object
     */
    public setup(): void {
        const userPoolId = XCE_CLOUD_USER_POOL_ID;
        const clientId = XCE_CLOUD_CLIENT_ID;
        const poolData = {
            UserPoolId: userPoolId,
            ClientId: clientId
        };
        this._userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    }

    /**
     * Create cognito user object if it doesn't exist
     */
    public ensureCognitoUserExists(username: string): void {
        if (!this._cognitoUser) {
            const userData = {
                Username: username,
                Pool: this._userPool
            };
            this._cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        }
    }

    /**
     * Send 6 digit confirmation code to email (username)
     * to confirm email of the new user
     */
    public resendConfirmationCode(callback: Function): void {
        this._cognitoUser.resendConfirmationCode(callback);
    }

    /**
     * Sign Up user in our Cognito user pool
     */
    public signUp(
        givenName: string,
        familyName: string,
        company: string,
        username: string,
        password: string,
        validationData: null,
        callback: Function
    ): void {
        const dataGivenName = {
            Name: 'given_name',
            Value: givenName
        };
        const dataFamilyName = {
            Name: 'family_name',
            Value: familyName
        };
        const dataCompany = {
            Name: 'custom:company',
            Value: company
        };

        const attributeFirstName = new AmazonCognitoIdentity.CognitoUserAttribute(dataGivenName);
        const attributeFamilyName = new AmazonCognitoIdentity.CognitoUserAttribute(dataFamilyName);
        const attributeCompany = new AmazonCognitoIdentity.CognitoUserAttribute(dataCompany);

        const attributeList = [];
        attributeList.push(attributeFirstName);
        attributeList.push(attributeFamilyName);
        attributeList.push(attributeCompany);

        let mycallback = (...args) => {
            this._cognitoUser = callback(...args);
        }

        this._cognitoUser = this._userPool.signUp(
            username,
            password,
            attributeList,
            validationData,
            mycallback
        );
    }

    /**
     * Confirm user email (user registration)
     */
    public confirmRegistration (code: string, callback: Function): void {
        this._cognitoUser.confirmRegistration(code, true, callback)
    }

    /**
     * Send confirmation code to user email
     * pre step for cognitoConfirmPassword
     */
    public forgotPassword(username: string, callbacks: {onSuccess: Function, onFailure: Function}): void {
        this._updateUser(username);
        this._cognitoUser.forgotPassword(callbacks);
    }

    /**
     * Set user's password to the newPassword
     */
    public confirmPassword(
        verificationCode: string,
        newPassword: string,
        callbacks: {
            onSuccess: Function,
            onFailure: Function
        }
    ): void {
        this._cognitoUser.confirmPassword(verificationCode, newPassword, callbacks)
    }

    /**
     * Update cognitoUser object
     */
    private _updateUser(username: string): void {
        const userData = {
            Username: username,
            Pool: this._userPool
        };
        this._cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    }
}