
var jsFileObj;
var pyFileObj;
var imgFileObj;

// File upload button onChange listeners. Make sure that either file is
// uploaded or path is specified

function addJsListener(evt) {
    jsFileObj = evt.target.files[0];
    if (jsFileObj) {
        $("#jsFilePath").prop("required", false);
    } else {
        $("#jsFilePath").prop("required", true);
    }
}

function addPyListener(evt) {
    pyFileObj = evt.target.files[0];
    if (pyFileObj) {
        $("#pyFilePath").prop("required", false);
    } else {
        $("#pyFilePath").prop("required", true);
    }
}

function addImgListener(evt) {
    imgFileObj = evt.target.files[0];
    if (imgFileObj) {
        $("#imgPath").prop("required", false);
    } else {
        $("#imgPath").prop("required", true);
    }
}

// Add the files as text fields to the form
jQuery.fn.addHidden = function (name, value) {
    return this.each(function () {
        var input = $("<input>").attr("type", "hidden").attr("name", name).val(value);
        $(this).append($(input));
    });
};

// read file and add the new field to the form
function readFile(file, fieldName, isText) {
    var deferred = jQuery.Deferred();
    var reader = new FileReader();

    reader.onload = function(evt) {
        var fileText = evt.target.result;
        if (!isText) {
            fileText = btoa(fileText);
        }
        $("#uploadContent").addHidden(fieldName, fileText);
        deferred.resolve(fileText);
    }

    reader.onerror = function() {
        deferred.reject(this);
    }

    if (file) {
        if (isText) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    } else {
        deferred.resolve();
    }

    return deferred.promise();
}

$(document).ready(function() {
    // make sure file upload buttons are reset after pressing back since the
    // variables that hold the file text are reset

    $( window ).on("unload", function() {
        $("#uploadContent").find("input[type=file]").val("");
    });

    $('#jsButton').change(addJsListener);

    $('#pyButton').change(addPyListener);

    $('#imgButton').change(addImgListener);

    $("#uploadContent").submit(function(evt) {
        evt.preventDefault();

        var jsFilePromise = readFile(jsFileObj, "jsFileText", true);
        var pyFilePromise = readFile(pyFileObj, "pyFileText", true);
        var imgPromise = readFile(imgFileObj, "imgBinary", false);

        jQuery.when(jsFilePromise, pyFilePromise, imgPromise)
        .then(function(jsOutput, pyOutput, imgOut) {
            var action;
            if (typeof expHost !== "undefined") {
                action = expHost + '/uploadContent';
            } else {
                action = '/app/uploadContent';
            }
            $("#uploadContent").attr("action", action);
            $("#uploadContent").get(0).submit();
        })
    })
})
