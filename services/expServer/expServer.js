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
	res.send('Please use post instead');
});

app.post('/', function(req, res) {
	var stuff = req.body;
	if (stuff && stuff["xipassword"] === "Welcome1") {
		res.send("Success");
	} else {
		res.send("Fail");
	}
});

var httpServer = http.createServer(app);

httpServer.listen(12123, function() {
	console.log("I am listening on port 12123");
});
