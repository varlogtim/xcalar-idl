describe("Concurrency Test", function() {
    var mutex;
    var lockString;

    describe("Mutex tests", function() {
        before(function(done) {
            mutex = new Mutex(xcHelper.randName("unitTestMutex"));
            done();
        });

        it("Undefined calls should fail", function(done) {
            Concurrency.initLock()
            .then(function() {
                throw "Error";
            }, function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                return Concurrency.lock();
            })
            .then(function() {
                throw "Error";
            }, function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                return Concurrency.tryLock();
            })
            .then(function() {
                throw "Error";
            }, function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                return Concurrency.forceUnlock();
            })
            .then(function() {
                throw "Error";
            }, function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                return Concurrency.isLocked();
            })
            .then(function() {
                throw "Error";
            }, function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                done();
            });
        });

        it("Lock call to uninited lock should fail", function(done) {
            var uninited = new Mutex("notInited");
            Concurrency.lock(uninited)
            .then(function() {
                throw "Error";
            })
            .fail(function() {
                done();
            });
        });

        it("Bogus call to test other keysetifequal return codes",
            function(done) {
            var uninited = new Mutex("notInited");
            Concurrency.lock(uninited.key) // This is deliberate
            .then(function() {
                throw "Error";
            })
            .fail(function() {
                done();
            });
        });

        it("Unlock call to uninited lock should fail", function(done) {
            var uninited = new Mutex("notInited");
            Concurrency.unlock(uninited.key, uninited.scope)
            .then(function() {
                throw "Error";
            })
            .fail(function() {
                done();
            });
        });

        it("isLocked call to uninited lock should fail", function(done) {
            var uninited = new Mutex("notInited");
            Concurrency.isLocked(uninited.key, uninited.scope)
            .then(function() {
                throw "Error";
            })
            .fail(function() {
                done();
            });
        });

        it("Should be able to get new lock", function(done) {
            Concurrency.initLock(mutex)
            .then(function() {
                return Concurrency.lock(mutex);
            })
            .then(function(ls) {
                lockString = ls;
                done();
            });
        });

        it("Should not get lock after it's been locked", function(done) {
            Concurrency.lock(mutex, 1000)
            .then(function(ls) {
                throw "Should not get lock!";
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal("Limit exceeded");
                done();
            });
        });

        it("Should not be able to unlock undef lock", function(done) {
            Concurrency.unlock()
            .then(function() {
                throw "Should not get lock!";
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal("Lock cannot be undefined");
                done();
            });
        });

        it("Should not be able to unlock with a wrong string", function(done) {
            Concurrency.unlock(mutex, lockString.substring(1))
            .then(function() {
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.be.true;
                done();
            })
            .fail(function() {
                throw "Should not error out!";
            });
        });

        it("Should fail trylock since lock is held", function(done) {
            Concurrency.tryLock(mutex)
            .then(function() {
                throw "Should fail trylock";
            })
            .fail(function(errorMessage) {
                expect(errorMessage).to.equal("Limit exceeded");
                done();
            });
        });

        it("Should be able to unlock with correct lockString", function(done) {
            Concurrency.unlock(mutex, lockString)
            .then(function() {
                lockString = undefined;
                done();
            })
            .fail(function() {
                throw "Should be able to unlock";
            });
        });

        it("Should be able to get trylock", function(done) {
            Concurrency.tryLock(mutex)
            .then(function(ls) {
                lockString = ls;
                done();
            })
            .fail(function() {
                throw "Should be able to get trylock";
            });
        });

        it("Should be able to forcefully get the lock away", function(done) {
            Concurrency.forceUnlock(mutex)
            .then(function() {
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.equal.false;
                done();
            })
            .fail(function() {
                throw "Should be able to forceUnlock anytime";
            });
        });

        it("Should still be able to unlock even though it's unlocked",
            function(done) {
            Concurrency.unlock(mutex, lockString)
            .then(function() {
                lockString = undefined;
                done();
            })
            .fail(function() {
                throw "Should still be able to unlock";
            });
        });

        it("Concurrency test case", function(done) {
            // T1: Lock
            // T2: Try to lock
            // T1: After 200 ms, unlock
            // T2's lock call should be successful.

            // Start test by ensuring lock is unlocked
            var t1ls;
            var t2ls;
            Concurrency.isLocked(mutex)
            .then(function(sts) {
                expect(sts).to.be.false;
                return Concurrency.lock(mutex);
            })
            .then(function(ls) {
                var deferred = jQuery.Deferred();
                t1ls = ls;
                setTimeout(function() {
                    Concurrency.unlock(mutex, t1ls)
                    .fail(function() {
                        throw "should be able to unlock!";
                    });
                }, 200);

                setTimeout(function() {
                    Concurrency.lock(mutex)
                    .then(function(ls) {
                        t2ls = ls;
                        deferred.resolve();
                    })
                    .fail(function() {
                        throw "Should be able to get the lock!";
                    });
                }, 1);

                return deferred.promise();
            })
            .then(function() {
                expect(t2ls).to.not.equal(t1ls);
                expect(t2ls).to.not.be.undefined;
                return Concurrency.isLocked(mutex);
            })
            .then(function(sts) {
                expect(sts).to.be.true;
                done();
            })
            .fail(function() {
                throw "should not fail anywhere";
            });
        });

        it("Delete lock", function(done) {
            Concurrency.delLock(mutex)
            .then(function() {
                return XcalarKeyLookup(mutex.key, mutex.scope);
            })
            .then(function(val) {
                expect(val).to.be.null;
                done();
            });
        });

        after(function(done) {
            XcalarKeyDelete(mutex.key, mutex.scope)
            .always(done);
        });
    });
});