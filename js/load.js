var loadURL;
var loadKey;
var loadTable;
var loadFormat;
var loadbar = {
    time: new Date().getTime(),
    pct: 0, // percent loaded
    newpct: 0, // used to compare against loadbar.pct
    inBobble: false,
    moving: true, // true if pct is increasing
    moveRange: $('#lbMoving').width() * 0.97, // bar starts 3% full;
    right: 0 // css relative right position 
}

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
        $("#dataTypeBox").css({"left": 0,
                               "top": 0,
                               "width": $("#dataTypeSelector").width() + 15,
                               "height": $("#mainFrame").height()
                              });
        $("#filePathSelector").show(); 
        $("#fileBrowser").focus();
    }
}

function preDsSubmit(e) {
    if (e.which == 13) {
       dsSubmit();
    }
}

function dsSubmit() {
    var url = $("#fileBrowser").val();
    if (url == null || url == "") {
        alert("Please enter a valid URL");
    } else {
        loadURL = url;
        $("#filePathBox").css({"left": $("#filePathSelector").position().left+5,
                               "top": 0,
                               "width": $("#filePathSelector").width() + 30,
                               "height": $("#mainFrame").height()});
        $("#keySelector").show();
        $("#keyName").focus();
    }
}

function preDetailsSubmit(e) {
    if (e.which == 13) {
       detailsSubmit();
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
                                  "top": 0,
                                  "width": $("#keySelector").width() + 45,
                                  "height": $("#mainFrame").height()});
        $("#uploadProgress").show();
        XcalarLoad(loadURL, loadKey, loadTable, loadFormat);
        loadbar.moveRange = $('#lbMoving').width() * 0.97;
        checkLoad();
    }
}

function checkLoad() {
    var refCount = XcalarGetTableRefCount(loadTable);
    adjustProgressBar(refCount);
    if (refCount == 1) {
        console.log("Done loading");
        setTimeout(function() {window.location.href="index.html"}, 1500);
    } else {
        // Check twice per second
        setTimeout(checkLoad, 500);
    }
}

$(document).ready(
    function() {
        $("#filePathSelector").hide();
        $("#keySelector").hide();
        $("#uploadProgress").hide();
    }
);

function adjustProgressBar(refCount) {
    var intervalLength = 500; // twice a second
    var transitionSpeed = 1200;
    var maxRunTime = 20000; // 20 seconds
    var numIncrements = maxRunTime / intervalLength;
    var pctIncrease = 100 / numIncrements; // percent of bar to increase per call
    var newTime = new Date().getTime();

    if (refCount == 1) {
        loadbar.pct = 1;
    } else {
        loadbar.pct += (pctIncrease / 100);
        if (loadbar.pct >= .94) {
            loadbar.pct = .94;
        }
    }
      
    loadbar.right = loadbar.moveRange * (1-loadbar.pct);

    if (loadbar.pct == loadbar.newpct) {
        if (newTime > (loadbar.time+transitionSpeed)) {
            // enough time for load bar to fully adjust
            loadbar.moving = false;
            if (!loadbar.inBobble) {
              progressBobble(loadbar.right, loadbar.pct);
              loadbar.inBobble = true;
            }    
        } 
    } else {
        loadbar.moving = true;
        loadbar.time = newTime;
    }
    loadbar.newpct = loadbar.pct;

    if (loadbar.moving && loadbar.pct <= 1) {
        $('#lbMoving').css( 'right' , loadbar.right);
    }
}

function progressBobble(right, pct) {
    moveBobble(right, pct);
    var bobSpeed = 600;
    var bobVal = 1;
    $('#lbMoving').addClass('lbBobble');
    var doBobble = setInterval(
        function() {
            if (!loadbar.moving) {
                if (bobVal < 0) {
                    moveBobble(right, pct);
                } else if(pct <= 1) {
                  $('#lbMoving').css( 'right', right);
                }
            } else {
            $('#lbMoving').removeClass('lbBobble');
              loadbar.inBobble = false;
              clearInterval(doBobble);
            }
            bobVal *= -1;
        }, bobSpeed
    );
}

function moveBobble(right, pct) {
    var bobRange = loadbar.moveRange * 0.02;
    if (pct <= 1) {
        $('#lbMoving').css( 'right', right - bobRange);
    }
}