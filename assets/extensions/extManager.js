window.ExtButton = (function(ExtButton, $) {
    function genSimpleButton(modName, fnName, buttonText) {
        var html = '<li class="extensions '+modName+'::'+fnName+'">';
        html += buttonText;
        html += '</li>';
        return (html);
    };

    function genComplexButton(modName, fnName, buttonText, arrayOfFields) {
        var html = '<ul class="extensions '+modName+'">';
        html += '<li style="text-align: center" class="clickable extensions">';
        // XXX Need to think about how to include this
        // html += '<div>'+buttonText+'</div>';
        for (var i = 0; i<arrayOfFields.length; i++) {
            html += '<div>'+arrayOfFields[i].name+'</div>';
            html += '<div class="inputWrap">'+
                        '<input class="'+arrayOfFields[i].fieldClass+
                            '" type="'+arrayOfFields[i].type+'"'+
                        ' spellcheck="false"/>'+
                        '<div class="iconWrapper inputAction">'+
                            '<span class="icon extensions '+modName+'::'
                                +fnName+'"></span>'+
                        '</div>'+
                    '</div>';
        }
        html += "</li></ul>";
        return (html);
    };

    function newButtonHTML(modName, fnName, buttonText, arrayOfFields) {
        // buttonText: this is the text that is on the button
        // arrayOfFields: this is an array of field that are texts for args
        // each entry in arrayOfFields contain descriptions for the types of
        // values that are allowable in the input boxes.
        
        // For example, for window, buttonText = "window"
        // arrayOfFields = [lagObj, leadObj]
        // lagObj = {"type": "number", <-kind of argument
        //           "name": "Lag",    <-text to be display above input
        //           "fieldClass": "lag"} <-class to be applied for fn to use
        // leadObj = {"type": "number",
        //            "name": "Lead",
        //            "fieldClass": "lead"}

        // For horizontal partitioning, buttonText = "horizontal partition"
        // arrayOfFields = [{"type": "number",
        //                   "name": "No. of Partitions",
        //                   "fieldClass": "partitionNums"}]
        if (arrayOfFields == undefined || arrayOfFields.length == 0) {
            // Simple button, no input
            return (genSimpleButton(modName, fnName, buttonText));
        } else {
            return (genComplexButton(modName, fnName, buttonText,
                                     arrayOfFields));
        }
    }
    
    ExtButton.getButtonHTML = function(modName) {
        var buttonList = window[modName].buttons;
        var buttonsHTML = "";
        for (var i = 0; i<buttonList.length; i++) {
            buttonsHTML += newButtonHTML(modName, buttonList[i]["fnName"],
                                         buttonList[i]["buttonText"],
                                         buttonList[i]["arrayOfFields"]);
        }
        return (buttonsHTML);
    }

    return (ExtButton);

}({}, jQuery));

window.ExtensionManager = (function(ExtensionManager, $) {
    var extList = [];
    var extFileNames = [];
    var numChecksLeft = 0;
    function setupPart4() {
        // get list of extensions currently loaded into system
        for (var objs in window) {
            if (objs.indexOf("UExt") === 0 ) {
                for (var i = 0; i<extFileNames.length; i++) {
                    if (objs.toLowerCase().substring(4, objs.length)+".ext"
                        === extFileNames[i].toLowerCase()) {
                        // Found it!
                        extList.push(objs);
                        break;
                    }
                }
            }
        }
        console.log("Extensions list: "+extList);

        for (var i = 0; i<extList.length; i++) {
            var buttonList = window[extList[i]].buttons;
            $("ul.extensions").append(ExtButton.getButtonHTML(extList[i]));
            if (i < extList.length - 1) {
                $("ul.extensions").append(
                '<div class="divider identityDivider thDropdown"></div>');
            }
        }
    }

    function removeExt(extName) {
        for (var i = 0; i<extFileNames.length; i++) {
            if (extFileNames[i] === extName) {
                extFileNames.splice(i, 1);
                break;
            }
        }
    }

    function setupPart3Success(extName, data) {
        // numChecksLeft can only be decremented inside the completion
        // for upload
        var pyString = data;
        // Remove .ext
        var pyModName = extName.substring(0, extName.length-4);
        XcalarUploadPython(pyModName, pyString)
        .then(function() {
            UDF.storePython(pyModName, pyString);
            KVStore.commit();
            numChecksLeft--;
            if (numChecksLeft === 0) {
                setupPart4();
            }
        })
        .fail(function() {
            console.error("Extension failed to upload. Removing: "+extName);
            // Remove extension from list
            removeExt(extName);
            numChecksLeft--;
            if (numChecksLeft === 0) {
                setupPart4();
            }
        });
    }
    
    function setupPart3Fail(extName, error) {
        removeExt(extName);
        numChecksLeft--;
        console.log("Python file not found!");
        if (numChecksLeft === 0) {
            // I am the last guy that completed. Since JS is single threaded
            // hallelujah
            setupPart4();
        }
    }
    
    function checkPythonFunctions(extFileNames) {
        // XcalarListXdfs with fnName = extPrefix+":"
        // Also check that the module has a python file
        var needReupload = [];
        for (var j = 0; j<extFileNames.length; j++) {
            needReupload.push(extFileNames[j]);
            continue;
            // XXX This part is not run because we are currently blindly
            // reuploading everything
            var extPrefix = extFileNames[j].substring(0,
                                                   extFileNames[j].length - 4);
            var found = false;
            for (var i = 0; i<udfFunctions.length; i++) {
                if (udfFunctions[i].indexOf(extPrefix+":") !== -1) {
                    found = true;
                    console.log("Found ext python: "+extPrefix);
                    break;
                }
            }
            if (!found) {
                console.log("Did not find ext python: "+extPrefix);
                needReupload.push(extFileNames[j]);
            }
        }
        return (needReupload);
    }

    function setupPart2() {
        // check that python modules have been uploaded
        var extLoaded = $("ul.extensions script");
        for (var i = 0; i<extLoaded.length; i++) {
            var jsFile = extLoaded[i]["src"];
                
            // extract module name
            var strLoc = jsFile.indexOf("assets/extensions/installed/");
            if (strLoc !== -1) {
                jsFile = jsFile.substring(strLoc+
                                         "assets/extensions/installed/".length,
                                         jsFile.length-3);
                extFileNames[i] = jsFile;   
            } else {
                extFileNames[i] = "";
                console.error("extensions are not located in extensions");
                continue;
            }
        }
        // Check that the python modules are uploaded
        // For now, we reupload everything everytime.
        var pythonReuploadList = checkPythonFunctions(extFileNames);
        if (pythonReuploadList.length === 0) {
            // No python requires reuploading
            setupPart4();
        } else {
        // if python module is gone, reupload by reading file from local system
            numChecksLeft = pythonReuploadList.length;
            for (var i = 0; i<pythonReuploadList.length; i++) {
                jQuery.ajax({
                    type: "GET",
                    url: "assets/extensions/installed/"+
                         pythonReuploadList[i]+".py",
                    success: (function(valOfI) {
                        return function(data) {
                            setupPart3Success(pythonReuploadList[valOfI],data);
                        }
                    })(i),
                    error: (function(valOfI) {
                        return function(error) {
                          setupPart3Fail(pythonReuploadList[valOfI], error);
                        }
                    })(i)
                });
            }
        }
    }

    ExtensionManager.setup = function() {
        // extensions.html should be autopopulated by the backend
        $("ul.extensions").empty(); // Clean up for idempotency
        // XXX change to async call later
        $("ul.extensions").load("assets/extensions/extensions.html",
                                undefined, setupPart2);
    };
    // This registers an extension.
    // The extension must have already been added via addExtension
    ExtensionManager.registerExtension = function(extName) {
        
    };
    // This unregisters an extension. This does not remove it from the system.
    ExtensionManager.unregisterExtension = function(extName) {
    };
    // This adds an extension to the current list of extensions. fileString
    // represents a version of the .py and .js files. It might be tar gz, or
    // might just be the two files concatted together. We are still deciding
    // This basically uploads the string to the backend and asks the backend to
    // Write it to a file in our designated location
    // This also requires that the backend writes some html into our .html
    // file that does the <script src> so that the new .js files get loaded
    ExtensionManager.addExtension = function(fileString, extName) {
        // Waiting for thrift call
    };
    // This removes the extension permanently from the system. This basically
    // undoes everything in addExtension
    ExtensionManager.removeExtension = function(extName) {
         // Might not support in 1.0
    };

    ExtensionManager.trigger = function(colNum, tableId, functionName,
                                        argList) {
        // function names must be of the form modName::funcName
        var args = functionName.split("::");
        if (args.length < 2) {
            // XXX alert error
            return;
        }
        var modName = args[0];
        var funcName = args[1];
        if (modName.indexOf("UExt") !== 0) {
            // XXX alert error
            return;
        }

        var $tableMenu = $('#colMenu');
        var $subMenu = $('#colSubMenu');
        var $allMenus = $tableMenu.add($subMenu);
 
        argList["allMenus"] = $allMenus;
        window[modName]["actionFn"](colNum, tableId, funcName, argList);
    };
    return (ExtensionManager);
}({}, jQuery));
