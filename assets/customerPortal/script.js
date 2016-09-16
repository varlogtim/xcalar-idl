function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' +
                            '([^&;]+?)(&|#|;|$)').exec(location.search) ||
                            [null, ''])[1].replace(/\+/g, '%20')) || null;
}
if (getURLParameter("reason") === "license") {
    $("#request_subject").val("Expired License");
    $("#request_custom_fields_41843327").attr("value", "License");
    $("#request_custom_fields_41843327").next().text("License");
    $("#request_description").attr("placeholder",
         "Please describe your license situation and how you like to proceed.");
}