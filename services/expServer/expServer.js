var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var app = express();
require('shelljs/global');

app.all('/', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	next();
});

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
	res.send('Random factoid on the internet: You owe jyang $5');
});

app.post('/', function(req, res) {
	console.log("I just received a request");
	var stuff = req.body;
	if (stuff) {
		if (stuff["xipassword"] === "eMtn397b") {
			res.send("Success");
		} else if (stuff["api"] === "listPackages") {
			fs.readFile("marketplace.json", "utf-8", function(err, data) {
			if (err) {
				console.log(JSON.stringify(err));
				res.send(JSON.stringify(err));
				return;
			}
			res.send(JSON.stringify(data));
		});
		} else {
			res.send("Fail");
	  	}

	} else {
		res.send("Fail");
	}
});

var httpServer = http.createServer(app);

httpServer.listen(12123, function() {
	console.log("I am listening on port 12123");
});
