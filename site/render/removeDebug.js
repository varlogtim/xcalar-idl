fs = require('fs');

function removeDebug() {
    // This operation is run from the "built" folder's root directory
    // This happens PRIOR to minification, so make sure the file paths
    // are the original paths, not the post minification paths
    // Scan through .js files in list and remove any that has
    /** START DEBUG ONLY **/
    // and ends with
    /** END DEBUG ONLY **/
    var filesToRemoveDebugFrom = ["assets/js/login.js"];
    for (var i = 0; i < filesToRemoveDebugFrom.length; i++) {
        console.log("Writing to "+filesToRemoveDebugFrom[i]);
        var contents = fs.readFileSync(filesToRemoveDebugFrom[i], "utf8");
        contents = contents.replace(/\/\*\* START DEBUG ONLY \*\*\/(.|\n)*?\/\*\* END DEBUG ONLY \*\*\//g, "");
        fs.writeFileSync(filesToRemoveDebugFrom[i], contents);
    }
}

module.exports = removeDebug;
