window.PromiseHelper = (function(PromiseHelper, $) {

	/**
	oneIter: Function that returns a promise. It represents one iteration of the
	loop.
	args: Arguments to apply to oneIter. Must be in an array
	condition: This is what we are going to call eval on. So this is a string
	that can take in arguments as in put and do whatever it wants with it. For
	example, if oneIter returns an integer, and we want to terminate if the
	integer is < 0.01(opaqueArgs.threshold), then
		condition = "arguments[0] < opaqueArgs.threshold"
	opaqueArgs: User can choose to use this argument in the condition. This
	function will not touch this argument and will not use it unless the caller
	manipulates it in side condition
	*/
	PromiseHelper.doWhile = function(oneIter, args, condition, opaqueArgs) {
		// XXX: Type check!
		function doWork() {
			return (oneIter.apply({}, args)
				.then(function() {
					if (!eval(condition)) {
						return doWork();
					}
				})
			)
		}

		return doWork();
	};

	/**
	Same thing as doWhile except that it checks for the condition first before
	kicking into doWhile loop
	*/
	PromiseHelper.while = function(oneIter, args, condition, opaqueArgs) {
		if (!eval(condition)) {
			return PromiseHelper.doWhile(oneIter, args, condition, opaqueArgs);
		} else {
			return jQuery.Deferred.promise().resolve();
		}
	};

	/**
	Runs all promises in the argument in parallel and resolves when all of
	them are complete or fails
	*/
	PromiseHelper.when = function() {
        var numProm = arguments.length;
        if (numProm === 0) {
            return PromiseHelper.resolve(null);
        }
        var mainDeferred = jQuery.Deferred();

        var numDone = 0;
        var returns = [];
        var argument = arguments;
        var hasFailures = false;

        for (var t = 0; t < numProm; t++) {
            whenCall(t);
        }

        function whenCall(i) {
            argument[i].then(function(ret) {
                console.log("Promise", i, "done!");
                numDone++;
                returns[i] = ret;

                if (numDone === numProm) {
                    console.log("All done!");
                    if (hasFailures) {
                        mainDeferred.reject.apply($, returns);
                    } else {
                        mainDeferred.resolve.apply($, returns);
                    }
                }
            }, function(ret) {
                console.warn("Promise", i, "failed!");
                numDone++;
                returns[i] = ret;
                hasFailures = true;
                if (numDone === numProm) {
                    console.log("All done!");
                    mainDeferred.reject.apply($, returns);
                }

            });
        }

        return (mainDeferred.promise());
	};

	/**
	Chains the promises such that only after promiseArray[i] completes, then
	promiseArray[i+1] will start.
	*/
	PromiseHelper.chain = function(promiseArray) {
	    if (!promiseArray ||
	        !Array.isArray(promiseArray) ||
	        typeof promiseArray[0] !== "function") {
	        return PromiseHelper.resolve(null);
	    }
	    var head = promiseArray[0]();
	    for (var i = 1; i < promiseArray.length; i++) {
	        head = head.then(promiseArray[i]);
	    }
	    return (head);
	};

    /* return a promise with resvoled value */
    PromiseHelper.resolve = function(value) {
        return jQuery.Deferred().resolve(value).promise();
    };

    /* return a promise with rejected error */
    PromiseHelper.reject = function(error) {
        return jQuery.Deferred().reject(error).promise();
    };

	return (PromiseHelper);

}({}, jQuery));