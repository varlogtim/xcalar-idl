var loadURL;
var loadKey;
var loadTable;
var loadFormat;

/* TODO:
   - Integrate progress bar
   - When the user clicks the next button after entering key and tablename,
     the next button is pressed and we send the command to the backend.
     This is a rather lenghty process and it makes the browser laggy. Instead
     of what we are currently doing, we can trigger the mouse up function
     before sending the command to backend. We should also show a spinner next
     to the next button. We should disable all event handling by the next button
     until our backend replies (and we get rid of the spinner). However, the
     user must be able to click the next button (psychological effect).
*/

function dataFormatSubmit() {
    var dataType = $("input[name=dsType]:checked").val();
    if (dataType == null) {
        alert("Please select your data format");
    } else {
        loadFormat = dataType;
        $("#dataTypeBox").css({"left": $("#mainFrame").position().left,
                               "top": $("#mainFrame").position().top,
                               "width": $("#dataTypeSelector").width() + 15,
                               "height": $("#mainFrame").height()
                              });
        $("#filePathSelector").show(); 
        $("#fileBrowser").focus();
    }
}

function dsSubmit() {
    var url = $("#fileBrowser").val();
    if (url == null || url == "") {
        alert("Please enter a valid URL");
    } else {
        loadURL = url;
        $("#filePathBox").css({"left": $("#filePathSelector").position().left+5,
                               "top": $("#mainFrame").position().top,
                               "width": $("#filePathSelector").width() + 30,
                               "height": $("#mainFrame").height()});
        $("#keySelector").show();
        $("#keyName").focus();
    }
}

function detailsSubmit() {
    var key = $("#keyName").val();
    var tablename = $("#tableName").val();
    if (key == null || tablename == null || key == "" || tablename == "") {
        alert("Please enter valid key and table name");
    } else {
        loadKey = key;
        loadTable = tablename;
        $("#keySelectorBox").css({"left": $("#keySelector").position().left+5,
                                  "top": $("#mainFrame").position().top,
                                  "width": $("#keySelector").width() + 45,
                                  "height": $("#mainFrame").height()});
        $("#uploadProgress").show();
        XcalarLoad(loadURL, loadKey, loadTable, loadFormat);
        setTimeout(
           function() {
                window.location.href="index.html";
           },
           20000);
    }
}

$(document).ready(
    function() {
        $("#filePathSelector").hide();
        $("#keySelector").hide();
        $("#uploadProgress").hide();
    }
);
