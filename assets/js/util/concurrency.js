/**
    Usage:
    1) var mutex = new Mutex(YOURKEY);
    2) Concurrency.initLock(mutex);
    3) Concurrency.lock(mutex, OPTIONAL TIMEOUT);
    4) Concurrency.unlock(mutex);
*/
window.Concurrency = (function($, Concurrency) {
    var unlocked = "0";
    var backoffBasis = 100; // Start time for exponential backoff.
    var backoffTimeLimit = 10 * 1000; // Max time allowed for a trial before
                                      // asking user for action

    // NOTE: This function can only be called ONCE by ONE instance.
    // Otherwise you are going to run into races
    Concurrency.initLock = function(lock) {
        var deferred = jQuery.Deferred();
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        XcalarKeyLookup(lock.key, lock.scope)
        .then(function(ret) {
            if (ret === null) {
                console.log("initialize", lock.key);
                return XcalarKeyPut(lock.key, unlocked, false, lock.scope);
            } else {
                return PromiseHelper.reject(ConcurrencyEnum.AlreadyInit);
            }
        })
        .then(deferred.resolve, deferred.reject)
        .fail(deferred.reject);

        return deferred.promise();
    };

    Concurrency.delLock = function(lock) {
        return XcalarKeyDelete(lock.key, lock.scope);
    };

    // Caller must look out for deferred.reject(ConcurrencyEnum.OverLimit)
    // and handle it appropriately.
    Concurrency.lock = function(lock, startBackoffBasis) {
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        var s ="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var lockString = Array.apply(null, Array(88)).map(function() {
            return s.charAt(Math.floor(Math.random() * s.length));
        }).join('');
        var backoff = backoffBasis;
        var deferred = jQuery.Deferred();

        if (startBackoffBasis) {
            backoff = startBackoffBasis;
        }
        // Deferred will get resolved / rejected inside retryLock
        retryLock(lock.scope, lock.key, lockString, deferred, backoff);
        return deferred.promise();
    };

    function retryLock(scope, key, lockString, deferred, timeout) {
        if (timeout > backoffTimeLimit) {
            return deferred.reject(ConcurrencyEnum.OverLimit);
        }
        // No locks can stay locked across restarts because XD is dead by then
        XcalarKeySetIfEqual(scope, false, key, unlocked, lockString)
        .then(function(sts) {
            if (sts === StatusT.StatusOk) {
                // Return the dynamically generated lockString for unlock later
                deferred.resolve(lockString);
            } else {
                // This happens when status is kvStore not found or kvEntry
                // not found.
                deferred.reject(ConcurrencyEnum.NoKVStore);
            }
        })
        .fail(function(tError) {
            if (tError.status === StatusT.StatusKvEntryNotEqual) {
                // Locked state. Exp backoff until time limit, and then ask the
                // user for force / give up
                console.log("Retrying with timeout: " + timeout / 1000);
                setTimeout(function() {
                    retryLock(scope, key, lockString, deferred, timeout * 2);
                }, timeout);
            } else {
                deferred.reject(tError.error);
            }
        });
    }

    // XXX FIXME move lockString as a property of the mutex
    Concurrency.unlock = function(lock, lockString) {
        var deferred = jQuery.Deferred();
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        XcalarKeyLookup(lock.key, lock.scope)
        .then(function(ret) {
            if (!ret) {
                console.warn(ConcurrencyEnum.NoKey);
                deferred.reject(ConcurrencyEnum.NoKey);
            } else {
                console.log(ret);
                if (ret.value === lockString) {
                    // I was the one who locked it. Now I'm going to unlock it
                    XcalarKeyPut(lock.key, unlocked, false, lock.scope)
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    // Looks like someone forced me out. Nothing for me to do
                    console.warn("Lock has been forcefully taken away, or " +
                               "unlocker is not the same as the locker. noop.");
                    deferred.resolve();
                }
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    Concurrency.forceUnlock = function(lock) {
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        return XcalarKeyPut(lock.key, unlocked, false, lock.scope);
    };

    Concurrency.tryLock = function(lock) {
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        // unless backoffTimeLimit is less than 2, otherwise this will cause
        // retryLock function to only run once
        return Concurrency.lock(lock, backoffTimeLimit - 1);
    };

    Concurrency.isLocked = function(lock) {
        var deferred = jQuery.Deferred();
        if (!lock) {
            console.error(ConcurrencyEnum.NoLock);
            return PromiseHelper.reject(ConcurrencyEnum.NoLock);
        }
        XcalarKeyLookup(lock.key, lock.scope)
        .then(function(ret) {
            if (!ret) {
                console.warn(ConcurrencyEnum.NoKey);
                deferred.reject(ConcurrencyEnum.NoKey);
            } else {
                if (ret.value === unlocked) {
                    deferred.resolve(false);
                } else {
                    deferred.resolve(true);
                }
            }

        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    return (Concurrency);
}(jQuery, {}));
