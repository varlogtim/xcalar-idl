function startup() {
    $("#step2").hide();
    $("#step3").hide();
    $("#step4").hide();
    $("#step5").hide();
    attachListeners();
}

function backListener() {
    var curId = $(this).attr("id").substring(4);
    var prevId = parseInt(curId) - 1;
    console.log(curId, prevId);
    $("#step"+curId).hide();
    $("#step"+prevId).show();
}

function nextListener() {
    var curId = $(this).attr("id").substring(4);
    var nextId = parseInt(curId) + 1;
    $("#step"+curId).hide();
    $("#step"+nextId).show();
}

function attachListeners() {
    $(".backButton").click(backListener);
    $(".nextButton").click(nextListener);
}
    
