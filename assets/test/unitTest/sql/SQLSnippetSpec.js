describe("SQLSnippet Test", function() {
    let sqlSnippet;
    let oldSnippets;
    let oldFetched;

    before(function() {
        sqlSnippet = SQLSnippet.Instance;
        oldSnippets = sqlSnippet._snippets;
        oldFetched = sqlSnippet._fetched;

        sqlSnippet._snippets = {"test": "val"};
    });

    it("should be a correct instance", function() {
        expect(sqlSnippet).to.be.an.instanceof(SQLSnippet);
    });

    it("listSnippets should work", function() {
        let res = sqlSnippet.listSnippets();
        expect(res).to.be.an("array");
        expect(res.length).to.equal(1);
        expect(res[0]).to.deep.equal({"name": "test", snippet: "val"});
    });

    it("listSnippetsAsync should work", function(done) {
        sqlSnippet._fetched = true;
        sqlSnippet.listSnippetsAsync()
        .then(function(res) {
            expect(res).to.be.an("array");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("getSnippet should work", function() {
        let res = sqlSnippet.getSnippet("test");
        expect(res).to.equal("val");
    });

    it("hasSnippet should work", function() {
        let res = sqlSnippet.hasSnippet("test");
        expect(res).to.equal(true);
    });

    it("writeSnippet should reject if not overwrite but has snippet", function(done) {
        sqlSnippet.writeSnippet("test", "new", false)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal(undefined);
            done();
        });
    });

    it("writeSnippet should resolve untitled case", function(done) {
        let oldFunc = sqlSnippet._updateSnippets;
        let called = false;
        sqlSnippet._updateSnippets = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        sqlSnippet.writeSnippet(SQLSnippet.Default, "new", false)
        .then(function() {
            expect(called).to.be.false;
            expect(sqlSnippet.getSnippet(SQLSnippet.Default)).to.equal("new");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            sqlSnippet._updateSnippets = oldFunc;
        });
    });

    it("writeSnippet should work for overwrite case", function(done) {
        let oldFunc = sqlSnippet._updateSnippets;
        let called = false;
        sqlSnippet._updateSnippets = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        sqlSnippet.writeSnippet("test", "new", true)
        .then(function() {
            expect(called).to.be.true;
            expect(sqlSnippet.getSnippet("test")).to.equal("new");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            sqlSnippet._updateSnippets = oldFunc;
        });
    });

    it("should delete snippet", function(done) {
        let oldFunc = sqlSnippet._updateSnippets;
        let called = false;
        sqlSnippet._updateSnippets = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        sqlSnippet.deleteSnippet("test")
        .then(function() {
            expect(called).to.be.true;
            expect(sqlSnippet.getSnippet("test")).to.equal("");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            sqlSnippet._updateSnippets = oldFunc;
        });
    });

    it("should handle delete non existing snippet case", function(done) {
        let oldFunc = sqlSnippet._updateSnippets;
        let called = false;
        sqlSnippet._updateSnippets = () => {
            called = true;
            return PromiseHelper.resolve();
        };

        sqlSnippet.deleteSnippet("test2")
        .then(function() {
            expect(called).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            sqlSnippet._updateSnippets = oldFunc;
        });
    });

    it("load should work", async function() {
        const snippetName = await sqlSnippet.load();
        const lastOpened = SQLSnippet.Instance.getLastOpenSnippet();
        if (lastOpened != null) {
            expect(snippetName).to.equal(lastOpened.name);
        }
    });

    it("setLastOpenedSnippet should work", async function() {
        await sqlSnippet.setLastOpenedSnippet('test1');
        await sqlSnippet._fetchLastOpenedSnippet();
        let lastOpenedSnippetName = sqlSnippet._lastOpenedSnippet;
        expect(lastOpenedSnippetName.name).to.equal("test1");

        await sqlSnippet.setLastOpenedSnippet('test2');
        await sqlSnippet._fetchLastOpenedSnippet();
        lastOpenedSnippetName = sqlSnippet._lastOpenedSnippet;
        expect(lastOpenedSnippetName.name).to.equal("test2");
    });

    it("_getKVStore should work", function() {
        let kvStore = sqlSnippet._getKVStore();
        expect(kvStore).to.be.an.instanceof(KVStore);
    });

    it("_fetchSnippets should work", function(done) {
        let oldFunc = KVStore.prototype.getAndParse;
        KVStore.prototype.getAndParse = () => PromiseHelper.resolve({"test": "new2"});

        sqlSnippet._fetched = false;

        sqlSnippet._fetchSnippets()
        .then(function() {
            expect(sqlSnippet._fetched).to.be.true;
            expect(sqlSnippet.getSnippet("test")).to.equal("new2");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            KVStore.prototype.getAndParse = oldFunc;
        });
    });

    it("_updateSnippets should work", function(done) {
        let oldFunc = KVStore.prototype.put;
        let called = false;
        KVStore.prototype.put = () => {
            called = true;
            return PromiseHelper.resolve();
        }

        sqlSnippet._updateSnippets()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            KVStore.prototype.put = oldFunc;
        });
    });

    after(function() {
        sqlSnippet._snippets = oldSnippets;
        sqlSnippet._fetched = oldFetched;
    });
});