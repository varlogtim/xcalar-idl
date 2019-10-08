describe("Cloud Login Test", () => {
    let cloudLoginFunctions;
    before(function() {
        cloudLoginFunctions = CloudLogin["__testOnly__"];
    });

    describe("Cloud Login Methods Test", function() {
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
});