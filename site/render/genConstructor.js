fs = require('fs');
path = require("path");
_ = require('underscore');

var src = "site/render/template/constructor.template.js";
var curCtorDest = "assets/js/constructor/xcalar-idl/xd/E_persConstructor.js";
var currentVersion = 2;

var warningString = "/* !!This file is autogenerated. " +
                    "Please do not modify */\n";
var idlSrc = "assets/js/constructor/xcalar-idl/xd";
var consLoc = "assets/js/constructor";

function copyCtor() {
    var ctorFiles = fs.readdirSync(idlSrc);
    for (var i = 0; i < ctorFiles.length; i++) {
        var contents = warningString +
                       fs.readFileSync(path.join(idlSrc, ctorFiles[i]), "utf8");
        fs.writeFileSync(path.join(consLoc, ctorFiles[i]), contents);
    }
}

function genCtor(isCurrentConstructor) {
    var dest, version;
    if (isCurrentConstructor) {
        version = null;
        dest = curCtorDest;
    } else {
        version = currentVersion;
        dest = genDest(currentVersion);
    }
    console.log("src", src)
    var str = fs.readFileSync(src).toString();
    var template = _.template(str);
    var parsedStr = template({
        "version": version,
        "isCurCtor": isCurrentConstructor
    });
    // comment starats with ! will not be removed by grunt htmlmin
    parsedStr = warningString + parsedStr.trim() + "\n";
    fs.writeFileSync(dest, parsedStr);
    copyCtor();
}

function genDest(version) {
    if (version > 26) {
        throw "version too large";
    }
    var str = "ABCDEFGHIJKLMNOPQRETUVWXYZ";
    var ch = (version < 2) ? "" : str[version - 1];
    return "assets/js/constructor/xcalar-idl/xd/D" + ch +
           "_persConstructorV" + version + ".js";
}

module.exports = genCtor;
