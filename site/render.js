fs = require('fs');
_ = require('underscore');
dicts = require('../assets/lang/html_en.js');

var destMap = {
    "index.html": "index.html"
};

function render(srcDir) {
    console.log(srcDir);
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

    var html = fs.readFileSync(path).toString();
    var template = _.template(html);
    var parsedHTML = template(dicts);
    fs.writeFileSync(dest, parsedHTML);
}

module.exports = render;