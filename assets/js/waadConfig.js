var waadEnabled = false;
var waadConfig;

function setWaadConfig(hostname, waadEnabledIn, tenant, clientId) {
    var deferred = jQuery.Deferred();
    var waadConfigOut = {
        waadEnabled: waadEnabledIn,
        tenant: tenant,
        clientId: clientId
    };

    console.log(waadConfigOut);

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/waadConfig/set",
        "data": JSON.stringify(waadConfigOut),
        "success": function () {
            waadEnabled = waadEnabledIn;
            deferred.resolve();
        },
        "error": function (errorMsg) {
            console.log("Failed to set waadConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getWaadConfig(hostname) {
    var deferred = jQuery.Deferred();

    if (waadEnabled) {
        return deferred.resolve(waadConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/waadConfig/get",
        "success": function (data) {
            waadConfig = {
                instance: 'https://login.microsoftonline.com/',
                tenant: data.tenant,
                clientId: data.clientId,
                postLogoutRedirectUri: window.location.origin,
                waadEnabled: data.waadEnabled,
                cacheLocation: 'sessionStorage'
            };
            waadEnabled = data.waadEnabled;
            if (waadEnabled) {
                xcLocalStorage.setItem("waadConfig", JSON.stringify(waadConfig));
            }
            deferred.resolve(waadConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve waadConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
};

function getWaadConfigFromLocalStorage() {
    var localWaadConfig = xcLocalStorage.getItem("waadConfig");
    if (localWaadConfig === null) {
        return null;
    }

    return JSON.parse(localWaadConfig);
}

