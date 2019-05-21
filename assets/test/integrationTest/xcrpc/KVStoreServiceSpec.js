const expect = require('chai').expect;
exports.testSuit = function(KVstoreService, KVSCOPE) {
    describe("KVStoreService Test: ", function () {

        it("lookup() should handle key not found error correctly", async function () {
            try {
                const result = await KVstoreService.lookup({keyName: "*", kvScope: KVSCOPE.GLOBAL})
            } catch(err) {
                console.log("lookup() did not handle not found error");
                expect.fail(err);
            }
        });

        it("addOrReplace() should add a new key in global scope", async function () {
            let keyName = "mykey";
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persis: false, kvScope: KVSCOPE.GLOBAL});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.equal('a');
            } catch(err){
                console.log("addOrReplace() did not add new key successfully");
                expect.fail(err);
            }
        });
        it("addOrReplace() should replace a existed key value in global scope", async function () {
            let keyName = "mykey";
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "b", persis: false, kvScope: KVSCOPE.GLOBAL});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.equal('b');
            } catch(err){
                console.log("addOrReplace() did not replace a exised key value successfully");
                expect.fail(err);
            }
        });

        it("deleteKey() should delete an existed key in global scope", async function () {
            //should use key list to make sure deleteKey sucessfully
            let keyName = "mykey";
            try {
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.GLOBAL})
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result).to.be.null;
            } catch(err){
                console.log("deleteKey() did not delete an existed key successfull");
                expect.fail(err);
            }
        });

        it("deleteKey() should handle the unexisted key", async function () {
            let keyName = "mykey";
            //should wait list methond check in
            try {
                await KVstoreService.deleteKey({ keyName: keyName, kvScope:KVSCOPE.GLOBAL})
            } catch(err){
                console.log("deleteKey() did not hanlde the unexisted key");
                expect.fail(err);
            }
        });
    });
}
