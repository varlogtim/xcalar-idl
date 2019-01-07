var client = require("./Client");
var context = null;

// Explicitly check if this code is running under nodejs
if ((typeof process !== 'undefined') &&
    (typeof process.versions !== 'undefined') &&
    (typeof process.versions.node !== 'undefined')) {
    var requireContext = require('require-context');
    context = requireContext("../xcalar", false, /_xcrpc\.js$/);
} else {
    context = require.context(".", false, /_xcrpc\.js$/);
}

// We want to get all of the top level service files (*_xcrpc.js)
// and gather their exposed services to re-expose here at the top level.
var obj = {};
context.keys().forEach(function (key) {
    // We have the name of the service file, let's get the actual module
    var thisMod = context(key);
    for (var k in thisMod) {
        if (thisMod.hasOwnProperty(k)) {
            // Now we can re-export each of the items exported in the original
            module.exports[k] = thisMod[k];
        }
    }
});

exports.XceClient = client.XceClient
