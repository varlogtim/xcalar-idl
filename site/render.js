fs = require('fs');
_ = require('underscore');
dicts = require('../assets/lang/html_en.js');

var tutorMap = {
    "datastoreDemo1.html": "datastoreDemo1",
    "datastoreDemo2.html": "datastoreDemo2",
    "workbookDemo.html": "workbookDemo"
};

function render(srcDir, destMap) {
    files = fs.readdirSync(srcDir);
    for (var i = 0, len = files.length; i < len; i++) {
        renderHelper(files[i], srcDir, destMap);
    }
}

function renderHelper(file, srcDir, destMap) {
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
