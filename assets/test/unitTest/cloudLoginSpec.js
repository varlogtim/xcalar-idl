describe("Cloud Login Test", () => {
    let cloudLoginFunctions;
    before(function() {
        cloudLoginFunctions = CloudLogin["__testOnly__"];
    });

    describe("Cloud Login Validations", function() {
        it("validateEmail should work", () => {
            const wrongEmails = [
                '',
                'a',
                'abcabcabcabc',
                'a@c',
                'abcabc@abcabc',
                'abcabc@xcalarcom',
                '@xcalarcom',
                '@xcalar.com',
                'abcabc@.com',
                'abcabc@xcalar.'
            ];

            const correctEmails = [
                'a@a.a',
                'abcabc@gmail.com',
                '123123@xcalar.com',
                'a1@example.org',
                'ABC@ABCABC.IO'
            ];

            wrongEmails.forEach((email) => {
                wrongValidation = cloudLoginFunctions.validateEmail(email);
                expect(wrongValidation).to.be.null;
            });

            correctEmails.forEach((email) => {
                correctValidation = cloudLoginFunctions.validateEmail(email);
                expect(correctValidation).to.not.be.null;
            });
        });

        it("validatePassword should work", () => {
            const wrongPasswords = [
                '',
                'a',
                'abcabcabcabc',
                'abcabc123456',
                'abcABC123456',
                'ABCABC123!@#',
                'abcABC!@#!@#',
                'aA1!'
            ];

            const correctPasswords = [
                'abcabcA1!',
                '!!!!!!!!!aA1',
                'Example1*'
            ];

            wrongPasswords.forEach((password) => {
                wrongValidation = cloudLoginFunctions.validatePassword(password);
                expect(wrongValidation).to.be.null;
            });

            correctPasswords.forEach((password) => {
                correctValidation = cloudLoginFunctions.validatePassword(password);
                expect(correctValidation).to.not.be.null;
            });
        });
    });

    describe("Cloud Login Fetches", function() {
        let oldFetch;
        let fetchArgs;

        before(function() {
            oldFetch = fetch;
            fetch = (...args) => {
                fetchArgs = args;
                return Promise.reject();
            }
        });
        it("/status should be called correctly", function(done) {
            cloudLoginFunctions.initialStatusCheck();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/status")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            done();
        });

        it("/login should be called correctly", function(done) {
            cloudLoginFunctions.cookieLogin('testLogin', 'testPassword');
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/login")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            expect(fetchParams.body).to.equal('{"username":"testLogin","password":"testPassword"}');
            done();
        });

        it("/logout should be called correctly", function(done) {
            cloudLoginFunctions.cookieLogout();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/logout")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            done();
        });

        it("/billing/get should be called correctly", function(done) {
            cloudLoginFunctions.checkCredit();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/billing/get")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        it("/cluster/get should be called correctly", function(done) {
            cloudLoginFunctions.getCluster();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/cluster/get")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        it("/cluster/start should be called correctly", function(done) {
            cloudLoginFunctions.startCluster();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/cluster/start")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        after(function() {
            fetch = oldFetch;
        });
    });
});