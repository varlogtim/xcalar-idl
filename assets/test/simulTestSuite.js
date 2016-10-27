var exec = require('child_process').exec;
var os = require("os");

var numUsers = 10;
var i = 0;
var hostname = "http://localhost:8888";

if (process.argv.length >= 3) {
	hostname = process.argv[2];
}
for (; i<numUsers; i++) {
	var id = Math.ceil(Math.random() * 10000);
	console.log("/usr/bin/open -a '/Applications/Google Chrome.app' '" +
	  	 		hostname + "/testSuite.html?test=true&user=testSuite" + id +
	  	 	    "&delay=5000&clean=true/'");
	exec("/usr/bin/open -a '/Applications/Google Chrome.app' '" +
	  	 hostname + "/testSuite.html?test=true&user=testSuite" + id +
	  	 "&delay=5000&clean=true/'");
}