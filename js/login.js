$(document).ready(function() {
    $('#loginButton').click(function() {
        console.log("username: "+$("#loginNameBox").val());
        console.log("password: "+$("#loginPasswordBox").val());
    });
});
