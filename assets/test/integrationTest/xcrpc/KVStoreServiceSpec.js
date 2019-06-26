const expect = require('chai').expect;
exports.testSuite = function(KVstoreService, KVSCOPE, STATUS) {
    let newKey = new Set()
    describe("KVStoreService Test: ", function () {

        it("lookup() should handle key not found error correctly", async function () {
            try {
                const result = await KVstoreService.lookup({keyName: "*", kvScope: KVSCOPE.GLOBAL});
                expect(result).to.be.null;
            } catch(err) {
                console.log("lookup() did not handle not found error");
                expect.fail(err);
            }
        });

        it("list() should works", async function() {
            let keyName = "testList";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.GLOBAL});
                const result2 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result2.numKeys).to.equal(result.numKeys+1);
                expect(result2.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                const result3 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result3.numKeys).to.equal(result2.numKeys-1);
                expect(result3.keys).to.not.include(keyName);
            } catch(err) {
                console.log("list() not work");
                expect.fail(err);
            }
        });

        it("list() should catch the error when keyRegex not match", async function(){

            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:"notExsit"});
                expect(result.numKeys).to.equal(0);
                expect(result.keys).to.be.an('array').that.is.empty;

            } catch(err) {
                console.log("when kvKeyRegex does not match, should return an empty array");
                expect.fail(err);
            }
        });

        it("addOrReplace() should add a new key in global scope", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.GLOBAL});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.equal('a');
            } catch(err){
                console.log("addOrReplace() did not add new key successfully");
                expect.fail(err);
            }
        });
        it("addOrReplace() should replace a existed key value in global scope", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.include(keyName);
                await KVstoreService.addOrReplace({key: keyName, value: "b", persist: false, kvScope: KVSCOPE.GLOBAL});
                const result2 = await KVstoreService.lookup({keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result2.value).to.equal('b');
            } catch(err){
                console.log("addOrReplace() did not replace a exised key value successfully");
                expect.fail(err);
            }
        });

        it("deleteKey() should delete an existed key in global scope", async function () {
            //should use key list to make sure deleteKey sucessfully
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.GLOBAL})
                const result2 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result2.numKeys).to.equal(result.numKeys-1);
                expect(result2.keys).to.not.include(keyName);
            } catch(err){
                console.log("deleteKey() did not delete an existed key successfull");
                expect.fail(err);
            }
        });

        it("deleteKey() should handle the unexisted key", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope:KVSCOPE.GLOBAL})
            } catch(err){
                console.log("deleteKey() did not hanlde the unexisted key");
                expect.fail(err);
            }
        });

        it("append() should append the value when the key exists", async function () {
            let keyName = "testAppend1";
            newKey.add(keyName);
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.GLOBAL});
                await KVstoreService.append({keyName: keyName, kvScope:  KVSCOPE.GLOBAL,
                    persist:false, kvSuffix: "bb"});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.equal('abb');
            } catch(err) {
                console.log("append() did not append the value when the key exists");
                expect.fail(err);
            }
        });

        it("append() should add the key when key does not exist", async function () {
            let keyName = "testAppend2";
            newKey.add(keyName);
            try {
                await KVstoreService.append({keyName: keyName, kvScope:  KVSCOPE.GLOBAL,
                    persist:false, kvSuffix: "cc"});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.equal('cc');
            } catch(err) {
                console.log("append() did not append the value when the key exists");
                expect.fail(err);
            }
        });

        it("setIfEqual() should set the value for the existed key", async function() {
            let keyName = "testSetIfEqual";
            let keyValue = "testValue";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: keyValue, persist: false, kvScope: KVSCOPE.GLOBAL});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                const result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
                expect(result2.noKV).to.be.false;
                const result3 = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.not.equal(result3.value);
                expect(result3.value).to.equal(keyValueSet);
            } catch(err) {
                console.log("setIfEqual() did not set the value for the existed key correctly");
                expect.fail(err);
            }
        });
        it("setIfEqual() should handle the error when the key does not exist", async function() {
            let keyName = "testSetIfEqual2";
            let keyValue = "testValue";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            try {
                const result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
                expect(result2.noKV).to.be.true;
            } catch(err) {
                console.log("setIfEqual() cannot throw an error when the key does not exist");
                expect.fail(err);
            }
        });

        it("setIfEqual() should return error when the keyValue does not match", async function(){
            let keyName = "testSetIfEqual";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                let keyValue = result.value + "notExist"
                const result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
                expect.fail("when keyValue does not match, shoul throw error")
            } catch(err) {
                expect(err.status).to.equal(STATUS.STATUS_KV_ENTRY_NOT_EQUAL);
            }
        });

        after(async function() {
            newKey.forEach(async function(val){
                await KVstoreService.deleteKey({ keyName: val, kvScope:KVSCOPE.GLOBAL});
            });
        });
    });
}
