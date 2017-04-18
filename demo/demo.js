$(document).ready(startDemo);

function startDemo() {
    function getUserIdUnique(name) {
        var hash = jQuery.md5(name);
        var len = 5;
        var id = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }
    var hostnames = ["http://localhost:8888"];
    var numWindows = 5;
    $overall = $(".overallContainer");
    for (var i = 0; i < numWindows; i++) {
        var urlString = "/testSuite.html?type=testSuite&test=y&noPopup=y&whichTest=demo";
        var username = "user-" + i;
        urlString += "&user=" + username;
        urlString += "&id=" + getUserIdUnique(username);
        console.log("User: " + username + ", Id: " + getUserIdUnique(username));
        $overall.append('<div class="container"><iframe class="frame" src="' +
                        hostnames[i%hostnames.length] + urlString +
                        '"></iframe></div>');
    }
}