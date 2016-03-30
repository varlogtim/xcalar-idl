fs = require('fs');
_ = require('underscore');
dicts = require('../assets/lang/html_en.js');

var destMap = {
    "index.html": "index.html",
    "datastoreDemo1.html": "assets/htmlFiles/walk/datastoreDemo1.html",
    "datastoreDemo2.html": "assets/htmlFiles/walk/datastoreDemo2.html",
    "workbookDemo.html": "assets/htmlFiles/walk/workbookDemo.html",
    "login.html": "assets/htmlFiles/login.html",
    "installerLogin.html": "assets/htmlFiles/installerLogin.html",
    "dologout.html": "assets/htmlFiles/dologout.html",
    "setup.html": "assets/htmlFiles/setup.html",
    "tableau.html": "assets/htmlFiles/tableau.html"
};

var tutorMap = {
    "datastoreDemo1.html": "datastoreDemo1",
    "datastoreDemo2.html": "datastoreDemo2",
    "workbookDemo.html": "workbookDemo"
};

function render(srcDir) {
    files = fs.readdirSync(srcDir);
    for (var i = 0, len = files.length; i < len; i++) {
        renderHelper(files[i], srcDir);
    }
}

function renderHelper(file, srcDir) {
    if (!destMap.hasOwnProperty(file)) {
        console.error(file, "has not dest");
        return;
    }

    var dest = destMap[file];
    var path = srcDir + '/' + file;

    if (tutorMap.hasOwnProperty(file)) {
        dicts.isTutor = true;
        // it should be found in html_en's tutor obj
        var tutorName = tutorMap[file];
        // overwrite the dicts.tutor[tutorName] to dicts.tutor.meta,
        // so all walkthough.html can just use dicts.tutor.meta
        // to find the string that needed
        dicts.tutor.meta = dicts.tutor[tutorName];
        dicts.tutor.name = tutorName;
    } else {
        dicts.isTutor = false;
        dicts.tutor.name = "";
    }

    var html = fs.readFileSync(path).toString();
    var template = _.template(html);
    var parsedHTML = template(dicts);
    fs.writeFileSync(dest, parsedHTML);
}

module.exports = render;
