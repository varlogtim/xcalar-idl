window.MonitorLog = (function(MonitorLog, $) {
	var $logCard;
    MonitorLog.setup = function() {
    	$logCard = $("#monitorLogCard");
        addListeners();
    };

    MonitorLog.show = function() {
    	$logCard.show();
    };

    MonitorLog.close = function() {
    	$logCard.hide();
    }

    function addListeners() {
    	$logCard.find('.recentLogsGroup').find('.xc-input')
    	.on('keydown', function(event) {
    		if (event.which === keyCode.Enter) {
    			getRecentLogs();
    		}
    	});
    	$logCard.find('.getRecentLogs').click(function() {
    		getRecentLogs();
    	});

    	$logCard.find('.removeSessGroup').find('.xc-input')
    	.on('keydown', function(event) {
    		if (event.which === keyCode.Enter) {
    			removeSessionFiles();
    		}
    	});
    	$logCard.find('.removeSessionFiles').click(function() {
    		removeSessionFiles();
    	});

    	$logCard.find('.streamBtns').on('click', '.btn', function() {
    		if ($(this).parent().hasClass('xc-disabled')) {
    			return;
    		}
    		if ($(this).hasClass('stopStream')) {
    			stopMonitorLog();
    		} else {
    			startMonitorLog();
    		}
    	});

    	$logCard.find('.clear').click(function() {
    		clearLogs();
    	});
    }

    function getRecentLogs() {
    	var $recentLogsGroup = $logCard.find('.recentLogsGroup');
    	var $input = $recentLogsGroup.find('.xc-input');
    	var val = $input.val().trim();
    	$input.blur();
    	
    	var isValid = xcHelper.validate([
	    	{
	    		"$ele": $input // check if it's empty
	    	},
            {
                "$ele" : $input,
                "error": "Please enter a value between 1 and 500",
                "check": function() {
                    return (!(parseInt(val) > 0 && parseInt(val) < 501));
                }
            }
        ]);
        if (!isValid) {
        	return false;
        }
        val = parseInt(val);

        $recentLogsGroup.addClass('xc-disabled');

    	XFTSupportTools.getRecentLogs(val)
    	.then(function(ret) {
    		xcHelper.showSuccess();
    		appendLog(ret.logs);
    	})
    	.fail(function(err) {
    		var msg;
            if (err.error.statusText === "error") {
                msg = ErrTStr.Unknown;
            } else {
                msg = err.error.statusText;
            }
            if (!msg) {
                msg = ErrTStr.Unknown; 
            }
            Alert.error(MonitorTStr.GetLogsFail, msg);
    	})
    	.always(function() {
    		$recentLogsGroup.removeClass('xc-disabled');
    		$input.blur();
    		$('.tooltip').hide();
    	});												 
    }

    function removeSessionFiles() {
    	var $inputGroup = $logCard.find('.removeSessGroup');
    	var $input = $inputGroup.find('.xc-input');
    	var val = $input.val().trim();
    	$input.blur();

    
    	var isValid = xcHelper.validate([
	    	{
	    		"$ele": $input // check if it's empty
	    	}
        ]);

        if (!isValid) {
        	return;
        }

        $inputGroup.addClass('xc-disabled');


    	XFTSupportTools.removeSessionFiles(val)
    	.then(function(ret) {
    		xcHelper.showSuccess();
    	})
    	.fail(function(err) {
    		var msg;
            if (err.error.statusText === "error") {
                msg = ErrTStr.Unknown;
            } else {
                msg = err.error.statusText;
            }
            if (!msg) {
                msg = ErrTStr.Unknown; 
            }
            Alert.error(MonitorTStr.RemoveSessionFail, msg);
    	})
    	.always(function() {
    		$inputGroup.removeClass('xc-disabled');
    	});	

    }

    function startMonitorLog() {
    	var $streamBtns = $logCard.find('.streamBtns');
    	var $btn = $logCard.find('.startStream');

    	$streamBtns.addClass('xc-disabled');
    	
    	XFTSupportTools.monitorLogs(function(err) {
    		$streamBtns.removeClass('xc-disabled streaming');
    		var msg;
            if (err.error.statusText === "error") {
                msg = ErrTStr.Unknown;
            } else {
                msg = err.error.statusText;
            }
            if (!msg) {
                msg = ErrTStr.Unknown; 
            }
            Alert.error(MonitorTStr.StartStreamFail, msg);

    	}, function(ret) {
    		$streamBtns.removeClass('xc-disabled').addClass('streaming');
    		appendLog(ret.logs);
    	});
    }

    function stopMonitorLog() {
    	var $streamBtns = $logCard.find('.streamBtns');
    	var $btn = $logCard.find('.stopStream');
    	$streamBtns.removeClass('xc-disabled streaming');

    	XFTSupportTools.stopMonitorLogs()
    	.fail(function(err) {
    		// xx stream interval should have stopped so it's ok to fail

    	});
    }

    function appendLog(msg) {
        var row = '<div class="msgRow"></div>';
    	var $content = $logCard.find('.content');
    	var scrollHeight = $content[0].scrollHeight;
    	var curScrollTop = $content.scrollTop();
    	var contentHeight = $content.height();
    	$logCard.find('.content').append(row);
        $logCard.find('.content').find('.msgRow').last().text(msg);

    	if (curScrollTop + contentHeight + 30 > scrollHeight) {
    		$content.scrollTop($content[0].scrollHeight);
    	}
    }

    function clearLogs() {
    	$logCard.find('.content').empty();
    }
    

    return (MonitorLog);
}({}, jQuery));
