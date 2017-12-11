(function($) {
    console.log("dynamic loaded");
    // Insert patch code here. Remembmer that all js files will be minified and
    // uglified
    function versionCheck(v1str, v2str) {
        var v1 = v1str.split(".");
        var v2 = v2str.split(".");
        if (1 * v1[0] !== 1 * v2[0]) {
            return (1 * v1[0] < 1 * v2[0]);
        }
        if (1 * v1[1] !== 1 * v2[1]) {
            return (1 * v1[1] < 1 * v2[1]);
        }
        if (1 * v1[2] !== 1 * v2[2]) {
            return (1 * v1[2] < 1 * v2[2]);
        }
    }
    var version = XVM.getVersion();
    if (version && versionCheck(version.split("-")[0], "1.3.0")) {
        // Make sure our patch only applies to certain versions
        // Change the second argument above as we need
        // Just wrap our patches with functions and call them here
        try {
            patchMixpanel();
        } catch (error) {
            console.log("mixpanel patching fails");
        }
    }
    if (version && versionCheck(version.split("-")[0], "1.3.1")) {
         try {
            patchDSPreview();
        } catch (error) {
            console.log("ds preview fails");
        }
    }
    function patchMixpanel() {
        console.log("patched");
        xcMixpanel.addListeners = function() {
            var lastFocus;
            $(window).load(function() {
                var name = XcSupport.getUser();
                if (name){
                    mixpanel.identify(name);
                    mixpanel.people.set({
                        "$last_name": name
                    });
                }
                var version = "No version info";
                if (XVM.getVersion()) {
                    version = XVM.getVersion().split("-")[0];
                }
                mixpanel.track("LoginEvent", {
                    "Username": name,
                    "Version": version,
                    "Timestamp": (new Date()).getTime()
                });
                emailNotification(name, version);
                lastFocus = (new Date()).getTime();
            });

            function emailNotification(username, version) {
                var emailOpts = {
                    "username": username,
                    "timestamp": (new Date()).getTime(),
                    "host": window.location.hostname,
                    "version": version
                };
                $.ajax({
                    "type": "POST",
                    "url": "https://kura8uu67a.execute-api.us-west-2.amazonaws.com/prod/mixpanel",
                    "data": JSON.stringify(emailOpts),
                    "contentType": "application/json",
                    success: function(data) {
                        console.log(data);
                    },
                    error: function(error) {
                        console.log(error);
                    }
                });
            }

            $(window).focus(function() {
                lastFocus = (new Date()).getTime();
            });
            $(window).blur(function() {
                var timestamp = (new Date()).getTime();
                var time = (timestamp - lastFocus)/1000 + " s";
                mixpanel.track("focusEvent", {
                    "Time": time,
                    "Timestamp": timestamp,
                    "Username": XcSupport.getUser(),
                    "Host": window.location.hostname
                });
            });
        };
    }

    function patchDSPreview() {
        var targetNode = document.getElementById('previewTable');
        // Options for the observer (which mutations to observe)
        var config = {childList: true};
        var observer;
        // Callback function to execute when mutations are observed
        var callback = function(mutationsList) {
            if (window.isBrowserSafari) {
                for (var i = 0; i < mutationsList.length; i++) {
                    var mutation = mutationsList[i];
                    if (mutation.type == 'childList') {
                        if (!$("#previewTable tbody").hasClass("patch")) {
                            console.log("patch preview!");
                            $("#previewTable tbody").addClass("patch");
                            $("#previewTable").removeClass("dataTable");
                            setTimeout(function() {$("#previewTable").addClass("dataTable");}, 0);
                            break;
                        }
                    }
                }
            } else {
                observer.disconnect();
            }
        };

        // Create an observer instance linked to the callback function
        observer = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        observer.observe(targetNode, config);
    }
}(jQuery));