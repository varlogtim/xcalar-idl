$(document).ready(function() {
    $("#loginContainer").hide();
    var stage = new swiffy.Stage(document.getElementById('swiffycontainer'),
                                 swiffyobject, {  });
    stage.start();
    setTimeout(function() {
        $('#swiffycontainer').fadeOut(1000, function() {
            $("#loginContainer").show();
        });
    }, 4500);
    
    $('#loginButton').click(function() {
        console.log("username: "+$("#loginNameBox").val());
        console.log("password: "+$("#loginPasswordBox").val());
    });
});
