window.Installer = (function($, Installer) {
    var numFields = 3;
    
    function createServerObj(host, user, pass) {
        return ({"hostname": host, "username": user, "password": pass});
    }

    function checkArguments() {
        var allRows = $(".server");
        if ($(allRows[0]).find(".username input").val() === "" ||
            $(allRows[0]).find(".password input").val() === "") {
            return false;
        }
        for (var i = 0; i<allRows.length; i++) {
            var fqdn = $(allRows[i]).find(".fqdn input").val();
            var user = $(allRows[i]).find(".username input").val();
            var pass = $(allRows[i]).find(".password input").val();
            if (fqdn && ((!user && !$("#sameuser")[0].checked) || 
                         (!pass && !$("#samepass")[0].checked))) {
                return false;
            }
        }
        return true;
    }

    function populateValue(kind) {
        var allRows = $(".server");
        var valToPop = $(allRows[0]).find("."+kind+" input").val();
        for (var i = 1; i<allRows.length; i++) {
            $(allRows[i]).find("."+kind+" input").val(valToPop);
        }
    }

    function sendViaHttps(arrayToSend) {
        jQuery.ajax({
            method: "POST",
            url: "https://cantor.int.xcalar.com:12124",
            data: JSON.stringify(arrayToSend),
            contentType: "application/json",
            success: function(retVal) {
                console.log(retVal);
                alert("Success!");
            },
            error: function(xhr, text, retVal) {
                alert("Failure: ", xhr);
            }
        })
    }

    Installer.setup = function() {
        $("#step2").hide();
        $("#numServers").on("keypress", function(e) {
            if (e.which === 13) {
                var serversToInstall = $("#numServers").val();
                if (serversToInstall < 0 || serversToInstall > 256) {
                    alert("Number of servers must be between 1 and 256");
                    return (false);
                }
                showStep2(serversToInstall);
                return (false);
            }
        });

        $("#sameuser").on("change", function() {
            if (this.checked) {
                var servList = $(".server:gt(0) .username input");
                for (var i = 0; i<servList.length; i++) {
                    $(servList[i]).attr("disabled", true)
                                  .css("background-color", "#EEE")
                                  .val("same as first");
                }
            } else {
                var servList = $(".server:gt(0) .username input");
                for (var i = 0; i<servList.length; i++) {
                    $(servList[i]).attr("disabled", false)
                                  .css("background-color", "#FFF")
                                  .val("");
                }
            }
        });
        $("#samepass").on("change", function() {
            if (this.checked) {
                var servList = $(".server:gt(0) .password input");
                for (var i = 0; i<servList.length; i++) {
                    $(servList[i]).attr("disabled", true)
                                  .css("background-color", "#EEE")
                                  .val("password");
                }
            } else {
                var servList = $(".server:gt(0) .password input");
                for (var i = 0; i<servList.length; i++) {
                    $(servList[i]).attr("disabled", false)
                                  .css("background-color", "#FFF")
                                  .val("");
                }
            }
        });
        $("#installButton").on("click", function() {
            var passed = checkArguments();
            if (!passed) {
                alert("Check usernames and passwords are all filled up");
                return;
            }
            var allRows = $(".server");
            var sendOver = [];
            if ($("#sameuser")[0].checked) {
                populateValue("username");
            }
            if ($("#samepass")[0].checked) {
                populateValue("password");
            }
            for (var i = 0; i<allRows.length; i++) {
                var fqdn = $(allRows[i]).find(".fqdn input").val();
                var user = $(allRows[i]).find(".username input").val();
                var pass = $(allRows[i]).find(".password input").val();
                if (fqdn) {
                    sendOver.push(createServerObj(fqdn, user, pass));
                }
            }
            sendViaHttps(sendOver);
        });
    }
    
    function showStep2(numServers) {
        for (var i = 0; i<numServers; i++) {
            var htmlStr = "<tr class='server'>";
            htmlStr += "<td class='fqdn'><input type='text'></td>";
            htmlStr += "<td class='username'><input type='text'></td>";
            htmlStr += "<td class='password'><input type='password'></td>";
            htmlStr += "</tr>";
            $("#tableForm").append(htmlStr);
        }
        $("#step2").show();
    }

    return Installer;
})(jQuery, {});
