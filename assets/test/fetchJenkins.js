// Fetch parameters for the last build
$.getJSON('http://jenkins.int.xcalar.com/job/EndTest-PoC/api/json/',
function(json) {
    $.getJSON(json['lastBuild']['url']+'api/json/', function(json) {
        for(action in json['actions']) {
            if(json['actions'][action].parameters) {
                console.log(json['actions'][action].parameters)
            }
        }
    });
});

// Refresh each user status
$.getJSON('http://jenkins.int.xcalar.com/job/EndTest-PoC/api/json/',
function(json) {
    $.get(json['lastBuild']['url']+'consoleText', function(text) {
        var lines = text.split("\n");
        var numUsers = 0;
        var usersStatus = [];
        var startDate = null;
        var status = null;
        for (var i = 0, len = lines.length; i < len; i++) {
            if (lines[i].startsWith("Test started: ")) {
                startTime = lines[i].replace("Test started: ", "")
                startDate = new Date(startTime)
            }

            for (var j=0; j < numUsers; j++) {
                if (startDate != null) {
                    duration = (new Date()-startDate)/1000
                    usersStatus[j] = {
                        "Status": "Running",
                        "Duration": duration
                    }
                }
            }

            if (lines[i].startsWith("/action?name=start")) {
                items = lines[i].split("&")
                numUsers = items[items.length-1].split("=")[1]
            }

            if (lines[i].startsWith("User finishes: ")) {
                statusLine = lines[i].replace("User finishes: ", "")
                userId = parseInt(statusLine.split(":: ")[0])
                statusLine = statusLine.split(":: ")[1]
                failure = parseInt(statusLine.
                    match(/(?:Fail:)(.+)(?:, Pass:)/)[1]);
                success = parseInt(statusLine.
                    match(/(?:Pass:)(.+)(?:, Skip:)/)[1]);
                if (failure == 0) {
                    status = "Success"
                } else {
                    status = "Failed"
                }
                duration = parseFloat(statusLine.
                    match(/(?:Time: )(.+)(?:s)/)[1]);
                console.log(usersStatus)
                console.log(status)
                console.log(duration)
                console.log(userId)
                usersStatus[userId] = {
                    "Status": status,
                    "Duration": duration
                }
                console.log(usersStatus)
                    
            }
        }
        console.log(usersStatus)
    });
});


// Historical run data, will return the top 10 results
$.getJSON('http://jenkins.int.xcalar.com/job/EndTest-PoC/api/json/',
function(json) {
    function parseResults(build, array) {
        $.get(json['builds'][build]['url']+'consoleText', function(text) {
            var lines = text.split("\n");
            var startTime = null;
            var endTime = null;
            var durationInSec = null;
            for (var i = 0, len = lines.length; i < len; i++) {
                if (lines[i].startsWith("==> Finished:")) {
                    users = lines[i].split("&");
                    var failure = 0;
                    var success = 0;
                    for (var j = 0, len2 = users.length; j < len2-1; j++) {
                        failure += parseInt(users[j].
                                      match(/(?:Fail:)(.+)(?:, Pass:)/)[1]);
                        success += parseInt(users[j].
                                      match(/(?:Pass:)(.+)(?:, Skip:)/)[1]);
                    }
                }
                if (lines[i].startsWith("Test ended: ")) {
                    endTime = lines[i].replace("Test ended: ", "")
                }
                if (lines[i].startsWith("Test started: ")) {
                    startTime = lines[i].replace("Test started: ", "")
                }
            }
            if (startTime != null && endTime != null) {
                startDate = new Date(startTime)
                endDate = new Date(endTime)
                durationInSec = (endDate-startDate) / 1000;
            }
            array[build] = {"Build": json['builds'][build]['number'],
                            "Failed": failure,
                            "Succeeded": success,
                            "Start": startTime,
                            "End": endTime,
                            "Duration": durationInSec};
        });
    }

    var results = [];
    for (var build in json['builds']) {
        parseResults(build, results);
        if (build >= 10) {
            break;
        }
    }
    console.log(results);
});
