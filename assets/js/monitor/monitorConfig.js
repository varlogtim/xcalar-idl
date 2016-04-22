window.MonitorConfig = (function(MonitorConfig, $) {
    MonitorConfig.setup = function() {
        $("#configStartNode").click(function() {
            $(this).blur();
            startNode();
        });

        $("#configStopNode").click(function() {
            $(this).blur();
            stopNode();
        });
    };

    function startNode() {
        console.log('start node!');
        // not works now!!
        // KVStore.commit()
        // .then(function() {
        //     return XcalarStartNodes(2);
        // }, function(error) {
        //     console.error("Failed to write! Commencing shutdown",
        //                    error);
        //     return XcalarStartNodes(2);
        // })
        // .then(function() {
        //     console.info("Restart Successfully!");
        //     // refresh page
        //     location.reload();
        // });
    }

    function stopNode() {
        console.log("Shut down!");

        // not works now!!!
        // KVStore.commit()
        // .then(function() {
        //     return XcalarShutDown();
        // });
    }

    return (MonitorConfig);
}({}, jQuery));
