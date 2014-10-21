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



$('.dataOptionsRow input').click(function(){
    var dataType = $("input[name=dsType]:checked").val();
    var dataElement = $("input[name=dsType]:checked").siblings('span');
    if (dataType == null) {
        alert("Please select your data format");
    } else {
        loadFormat = dataType;
        moveInputLeft(dataElement);
        $('.dataStep').addClass('transitionGreen');
        $("#filePathSelector").css('left',415); 
        $("#fileBrowser").focus().css('left',550).css('z-index', 6);
        $('.dataOptions').addClass('shiftRight');
        $("#progressBar").css('left', -855);
        
    }
});

function moveInputLeft(movingEl) {
    // var movign = $('.dsTypeLabel[value='+val+']');
    // var input = $('.dsTypeLabel:contains("'+val+'")');
    var loadROffsetLeft = $('#load_r').offset().left;
    var loadROffsetTop = $('#load_r').offset().top;
    var targetLeft = parseFloat($('.dataStep').css('left'));
    var targetMidPoint = ($('.dataStep').width()/2)+targetLeft;
    var movingElOffsetLeft = movingEl.offset().left;
    var movingElOffsetTop = movingEl.offset().top;
    var movingElFontSize = movingEl.css('font-size');
    var movingElFontWeight= movingEl.css('font-weight');
    var movingElWidth = movingEl.width();
    clone = movingEl.clone();
    clone.appendTo($('#load_r'));
    clone.css({'position':'absolute', 'left':(movingElOffsetLeft - loadROffsetLeft),
                'top':(movingElOffsetTop-loadROffsetTop), 'z-index':6, 
                'font-size':movingElFontSize, 'font-weight':movingElFontWeight});
    clone.addClass('shiftLeft');
    setTimeout(function(){
        movingEl.hide();
        clone.css({'left':(targetMidPoint-(movingElWidth/2)), 'top':'23px'});
    },1);

}

function dsSubmit(e) {
    if (e.which != 13) {
       return;
    }
    var url = $("#fileBrowser").val();
    if (url == null || url == "") {
        alert("Please enter a valid URL");
    } else {
        loadURL = url;
        moveElementLeft('#fileBrowser', '#filePathSelector');
        $("#keySelector").show().css('left',620);
        $("#tableName").focus().css('left',830).css('z-index', 6);
        setTimeout(
            function() {
                $("#progressBar").css('left', -575);
            }, 200
        );
        setTimeout(
            function() {
                $('#load_r').css({'z-index': 2});
                $('#loadArea').css({'z-index': 2});
                $('#datastorePanel').width(0).addClass('slideRight');
            }, 1200
        );
        $('#fileBrowser').addClass('shiftRight');
    }
}

function moveElementLeft(movingEl, target) {
    var movingEl = $(movingEl);
    var target = $(target);
    var clone = movingEl.clone();
    var loadROffsetLeft = $('#load_r').offset().left;
    var targetLeft = parseFloat(target.css('left'));
    var textMidPoint = (target.width()/2)+targetLeft;
    var movingElWidth = getTextWidth(movingEl);
    clone.appendTo('#load_r');
    movingEl.val(" ").blur();
    clone.css({'background-color':'transparent', 'padding':0}).prop('disabled', true);
    clone.addClass('shiftLeft').css({'left':(textMidPoint-(movingElWidth/2)), 'font-size':20});
    target.addClass('transitionGreen');
}

function detailsSubmit(e) {
    if (e.which != 13) {
       return
    }
    var key = "user_id";
    var tablename = $("#tableName").val();
    if (tablename == null || tablename == "") {
        alert("Please enter valid dataset name");
    } else {
        moveElementLeft('#tableName','#keySelector');
        $('#tableName').addClass('shiftRight').blur();
        loadKey = key;
        loadTable = tablename;
        var dsId = XcalarLoad(loadURL, loadFormat);
        if (dsId != null) {
            setDsToName(tablename, dsId);
            commitToStorage();
            startProgressBar();
        }
        $('.datasetWrap').removeClass('shiftRight').hide();
        
        // checkLoad();
    }
}

function startProgressBar() { 
    setTimeout(
        function() {
            $('#progressBar').addClass('slowProgressTransition').css('left', 0);
        }, 100
    );
    var startPos= parseInt($('#progressBar').css('left'));
    var goalPos = 0;
    var posRange = goalPos - startPos;
    var startPercentage = 50;
    var currentPos = startPos;
    var currentPercentage = startPercentage;
    var getPercentage = setInterval(function(){
        currentPos = parseInt($('#progressBar').css('left'));
        currentPercentage = startPercentage +  50*((currentPos - startPos) / posRange);
        $('#loadPercentage').text(Math.ceil(currentPercentage)+"%");
        if (currentPercentage > 55) {
            $('#loadPercentage').fadeIn();
        }
        if (currentPos >= goalPos) {
            clearInterval(getPercentage);
            setTimeout(function() {
                getTablesAndDatasets();
                $('.datasetWrap').show();
                $('#datastorePanel').css({'background-color': 'white'});
                $('#loadArea').css('background-color', '#E6E6E6');
                $('#datastorePanel').width('200%');
                $('#progressBar').css('left', 10000);
            },100);
            setTimeout(function(){
                $('#loadArea').html("").css({'background-color': 'transparent', 'z-index':'initial'});
                $('#datastorePanel').removeClass('slideRight');
                $('#datastorePanel').css({'background-color': 'transparent'});
                $('#datastorePanel').width('100%');
            },1300);
        }
    }, 500);
}

function checkLoad() {
    var refCount = XcalarGetTableRefCount(loadTable);
    adjustProgressBar(refCount);
    if (refCount == 1) {
        console.log("Done loading");
        setTimeout(function() {window.location.href="index.html"}, 1400);
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
        monitorOverlayPercent();
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
