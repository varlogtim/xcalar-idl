var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require("http");
var https = require("https");
require('shelljs/global');

// var privateKey = fs.readFileSync('cantor.int.xcalar.com.key', 'utf8');
// var certificate = fs.readFileSync('cantor.int.xcalar.com.crt', 'utf8');
// var credentials = {key: privateKey, cert:certificate};

var app = express();
app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Please use post instead');
});

app.post('/', function(req, res) {
    var struct = req.body;
    if (struct.api === "listPackages") {
        var f = fs.readFile("marketplace.json", (err, data) => {
            if (err) throw err;
            res.send(data);

        });
    }

});

// var httpsServer = https.createServer(credentials, app);

// httpsServer.listen(12124, function() {
//     console.log("https app listening!");
// });

var httpServer = http.createServer(app);
httpServer.listen(12123, function() {
    console.log("marketPlace http app listening on 12123!");
});
