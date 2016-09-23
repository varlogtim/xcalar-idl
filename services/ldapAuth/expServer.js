var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');
var app = express();
require('shelljs/global');
var ldap = require('ldapjs');

var strictSecurity = false;
var config = require('./ldapConfig.json');

//
// Example AD settings (now gotten from ldapConfig.json)
//
/*var ldap_uri = 'ldap://pdc1.int.xcalar.com:389';
var userDN = "cn=users,dc=int,dc=xcalar,dc=net";
var useTLS = true;
var searchFilter = "(&(objectclass=user)(userPrincipalName=%username%))";
var activeDir = true;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

//
// Example OpenLDAP Settings (now gotten from ldapConfig.json)
//

/* var ldap_uri = 'ldap://turing.int.xcalar.com:389';
var userDN = "uid=%username%,ou=People,dc=int,dc=xcalar,dc=com";
var useTLS = false;
var searchFilter = "";
var activeDir = false;
var serverKeyFile = '/etc/ssl/certs/ca-certificates.crt'; */

var trustedCerts = [fs.readFileSync(config.serverKeyFile)];


function _unbindError(step) {
    return function(err) {
	if(err){
	    console.log(err.message);
	} else {
	    console.log('client disconnected ' + step);
	};
    };
};

function _bindCallback(client, searchOpts, httpres, userDN) {
    return function(err, res) {
	var bindUnbindErr = _unbindError('1');
	var searchUnbindErr = _unbindError('2');

	if (err) {
	    console.log(err.message);
	    client.unbind(bindUnbindErr);
	    httpres.send("LDAP Bind Failure!\n");
	} else {
	    console.log('connected');

	    client.search(userDN, searchOpts, function(error, search) {
		console.log('Searching.....');

		var entry_count = 0;

		search.on('searchEntry', function(entry) {
		    console.log('Checking entries.....');
		    if(entry.object){
			console.log('entry: %j ' + JSON.stringify(entry.object));
			entry_count++;
		    }
		});

		search.on('error', function(error) {
		    console.error('LDAP search error: ' + error.message);
		    httpres.send("LDAP Search Failure!\n");
		    client.unbind(searchUnbindErr);
		});

		search.on('end', function(result) {
		    console.log('status: ' + result.status);
		    if (entry_count > 1) {
			httpres.send('LDAP '+entry_count+' Success!\n');
		    } else if (entry_count === 1) {
			httpres.send('LDAP Success!\n');
		    } else {
			httpres.send('LDAP Failure!\n');
		    }
		    client.unbind(searchUnbindErr);
		});
	    });
	};
    };
};

app.all('/', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	next();
});

function ldapAuth(username, password, client, bindCallback, bindErr, res) {
    console.log('--- going to try to connect user ---');
    try {
	client.bind(username, password, bindCallback);
    } catch(error){
	console.log(error);
	client.unbind(bindErr);
	res.send("LDAP Connection Failure!");
    };
};

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

		// here is the LDAP related material
		// it's activated if xiusername is in the request body
		} else if ("xiusername" in stuff) {

		    var username = stuff["xiusername"];
		    var password = stuff["xipassword"];
		    var client_url = config.ldap_uri.endsWith('/') ? config.ldap_uri : config.ldap_uri+'/';
		    var userDN = config.userDN;
		    var searchFilter = config.searchFilter;

		    var activeDir = (config.activeDir === 'true');
		    var useTLS = (config.useTLS === 'true');

		    console.log('connecting to: '+client_url);

		    var client = ldap.createClient({
			url: client_url,
			timeout: 10000,
			connectTimeout: 20000
		    });

		    var searchOpts = {
			filter: searchFilter != "" ?
			    searchFilter.replace('%username%',username) : undefined,
			scope: 'sub',
			attributes: ['CN']
		    };

		    if (!activeDir) {
			userDN = userDN.replace('%username%', username);
			username = userDN;
		    }

		    var bindCallback = _bindCallback(client, searchOpts, res, userDN);

		    var excpUnbindErr = _unbindError('3');

		    if (useTLS) {

			//console.log(trustedCerts);

			var tlsOpts = {
			    cert: trustedCerts,
			    rejectUnauthorized: strictSecurity
			};

			console.log("Starting TLS...");
			client.starttls(tlsOpts, [], function(err) {
			    if (err) {
				console.log("TLS startup error: " + err.message);
				res.send("LDAP TLS Failure!\n");
				return;
			    }

			    ldapAuth(username, password, client, bindCallback, excpUnbindErr, res);
			});
		    } else {
			ldapAuth(username, password, client, bindCallback, excpUnbindErr, res);
		    };

		} else if (stuff["api"] === "listPackages") {
		    fs.readFile("marketplace.json", "utf-8", function(err, data) {
			if (err) {
			    console.log(JSON.stringify(err));
			    res.send(JSON.stringify(err));
			    return;
			}
			res.send(data);
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
