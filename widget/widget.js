function startup() {
    $("#step2").hide();
    $("#step3").hide();
    $("#step4").hide();
    $("#step5").hide();
    $("#step6").hide();
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

function radioListener() {
    $(".radio").removeClass("activeRadio");
    $(this).addClass("activeRadio");
}

function checkListener() {
    $(this).toggleClass("activeCheck");
}

function textboxListener() {
    var numOptions = $("#textbox").val();
    var html = "";
    for (var i = 0; i<numOptions; i++) {
        html += '<div id="option'+(i+1)+'" class="option">Option '+
                 (i+1)+': </div>';
        html += '<input type="textbox" id="option'+(i+1)+
                '" class="optionVal"></div>';
    }
    $("#textbox").after(html);
}

function confirmListener() {
    $("#widgetType").text("Radio Buttons");
    $("#parameter").text("<view>");
    $("#inst").text($("#instructions").val().substring(0, 15)+"...");
    var optStr = "";
    for (var i = 0; i<$("#textbox").val(); i++) {
        optStr += $(".optionVal#option"+(i+1)).val()+" ";
    }
    $("#options").text(optStr);
}

function publishListener() {
    var html = "";
    for (var i = 0; i<$("#textbox").val(); i++) {
        html += '<div id="radio'+(i+1)+'" class="radio"></div>';
        html += '<div id="choice'+(i+1)+'" class="choice">'+
                $(".optionVal#option"+(i+1)).val()+'</div>';
    }
    $("#title").text($("#instructions").val());
    $("#title").after(html);
    $("#step6 #radio1").click();
}

function attachListeners() {
    $(".backButton").click(backListener);
    $(".nextButton").click(nextListener);
    $(document).on("click", ".radio", radioListener);
    $(".check").click(checkListener);
    $("#textbox").keypress(function(e) {
        if (e.which == 13) {
            textboxListener();
        }
    });
    $("#next4").click(confirmListener);
    $(".publish").click(publishListener);
}
    
