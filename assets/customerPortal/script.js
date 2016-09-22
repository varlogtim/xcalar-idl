var xcUserName = $("#user-name").text();
   $("#xcalarFrame").attr("src", "https://zd.xcalar.net/todo/api/v1.0/keyshtml/" + xcUserName);

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' +
                            '([^&;]+?)(&|#|;|$)').exec(location.search) ||
                            [null, ''])[1].replace(/\+/g, '%20')) || null;
}
if (getURLParameter("reason") === "license") {
    $("#request_subject").val("Need to Renew License");
    $("#request_custom_fields_41843327").attr("value", "expired_license");
    $("#request_custom_fields_41843327").next().text("Expired License");
    $("#request_description").attr("placeholder",
         "Please describe your license situation and how you like to proceed.");
}
