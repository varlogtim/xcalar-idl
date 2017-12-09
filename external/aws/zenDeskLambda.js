var cp = require("child_process");
var aws = require('aws-sdk');

exports.handler = function(event, context) {
    console.log("Received ticket");
    console.log(JSON.stringify(event));
    var contents = JSON.stringify(event, null, 4);
    helper(contents, context);
};

function stripLogsAndKey(c) {
    c = JSON.parse(c);
    if (c.hasOwnProperty("xiLog") && c.xiLog.hasOwnProperty("logs")) {
        c.xiLog.logs = ["Refer to email for full dump"];
    }
    if (c.hasOwnProperty("xiLog")) {
        if (c.xiLog.hasOwnProperty("logs")) {
            c.xiLog.logs = ["Refer to email for full dump"];
        }
        if (c.xiLog.hasOwnProperty("errors")) {
            var xiLogs = c.xiLog;
            var errStr = JSON.stringify(c.xiLog.errors);
            var errorLimit = 50 * 1024;
            if (errStr.length > errorLimit) {
                var strErrors = "";
                for (var i = xiLogs.errors.length - 1; i >= 0; i--) {
                    var strError = JSON.stringify(xiLogs.errors[i]);
                    if (strErrors.length + strError.length < errorLimit) {
                        if (strErrors.length) {
                            strErrors += ",";
                        }
                        strErrors += strError;
                    } else {
                        break;
                    }
                }
                strErrors = "[" + strErrors + "]";
                c.xiLog.errors = JSON.parse(strErrors);
            }
        }
    }
    if (c.hasOwnProperty("license") && c.license.hasOwnProperty("key")) {
        delete c.license.key;
    }
    return JSON.stringify(c, null, 2);
}

function helper(contents, ctx) {
    // Following function is from https://gist.github.com/tmazur/3965625
    /*function isValidEmail(emailAddress) {
        var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    }*/
    var contentsObj = JSON.parse(contents);
    var license = contentsObj.license;
    console.log("license", license);
    var isNew = (contentsObj.ticketId === null);
    if (!isNew && contentsObj.needsOrgCheck) {
        // calls fetch admind then submitTicket if there are no errors
        organizationCheck(contents, ctx, contentsObj);
    } else {
        if (license && license.organization) {
            // calls submitTicket if there are no errors
            fetchAdmin(contents, ctx, contentsObj, license.organization);
        } else {
            submitTicket(contents, ctx, contentsObj);
        }
    }
}

// fetches ticket to get the organization id, then calls
// organizationCheckPartTwo to get the organization info and compares it to
// the organization the user is under
function organizationCheck(contents, ctx, contentsObj) {
    if (!contentsObj.license || !contentsObj.license.organization) {
        ctx.done(null, {error: "User did not provide organization."});
        return;
    }

    var ticketId = contentsObj.ticketId;
    var cmd = 'curl https://myxcalar.zendesk.com/api/v2/tickets/' + ticketId + '.json' +
                ' -H "Content-Type: application/json"  -v ' +
                '-u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej';
    console.log("cmd", cmd);
    var out = cp.exec(cmd);
    var stringifiedStruct = "";
    out.stdout.on("data", function(data) {
        stringifiedStruct += data;
    });
    out.on('close', function() {
        console.log("ticket fetching completes");
        var orgFieldFound = false;
        try {
            var jstruct = JSON.parse(stringifiedStruct);
            console.log("jstruct", jstruct);
            if (jstruct.ticket && jstruct.ticket.organization_id) {
                var orgId = jstruct.ticket.organization_id;
                console.log("orgId", orgId);
                organizationCheckPartTwo(contents, ctx, contentsObj, orgId);
            } else {
                if (jstruct.error) {
                    console.log("fetching fails");
                    ctx.done(null, {error: "Fetching organization failed."});
                } else {
                    ctx.done(null, {error: "Ticket could not be found."});
                }
            }
        } catch (error) {
            console.log("fetching ticket error", error);
            ctx.done(null, {error: "Fetching organization failed."});
        }
    });
}

// get the organization info and compares it to
// the user's organization and submits ticket if successful
function organizationCheckPartTwo(contents, ctx, contentsObj, orgId) {
    var userOrgName = contentsObj.license.organization;

    var cmd = 'curl https://myxcalar.zendesk.com/api/v2/organizations/' + orgId + '.json' +
            ' -v -u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej';
    console.log("cmd", cmd);
    var out = cp.exec(cmd);
    var stringifiedStruct = "";
    out.stdout.on("data", function(data) {
        stringifiedStruct += data;
    });
    out.on('close', function() {
        console.log("org fetching completes");
        var orgFieldFound = false;
        try {
            var jstruct = JSON.parse(stringifiedStruct);
            console.log("jstruct", jstruct);
            if (jstruct.organization && jstruct.organization.name) {
                var tickOrgName = jstruct.organization.name;
                console.log(tickOrgName, userOrgName);
                if (tickOrgName === userOrgName) {
                    console.log("ticket organization name matches user organization name");
                    fetchAdmin(contents, ctx, contentsObj, userOrgName);
                } else {
                    ctx.done(null, {error: "User does not belong to ticket organization."});
                }
            } else {
                ctx.done(null, {error: "Fetching organization failed."});
            }
        } catch (error) {
            console.log("fetching ticket error", error);
            ctx.done(null, {error: "Fetching organization failed."});
        }
    });
}

function fetchAdmin(contents, ctx, contentsObj, org) {
    var url = "https://myxcalar.zendesk.com/api/v2/search.json?";
    var cmd = 'curl ' + url + ' ' +
               '-G --data-urlencode "query=type:user tags:admin organization:\''+ org +'\'" ' +
               '-H "Content-Type: application/json" -v ' +
               '-u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej';
    console.log("cmd", cmd);
    var out = cp.exec(cmd);
    var admin;
    var stringifiedStruct = "";
    out.stdout.on("data", function(data) {
        stringifiedStruct += data;
    });
    out.on('close', function() {
        console.log("fetching completes");
        try {
            var jstruct = JSON.parse(stringifiedStruct);
            console.log("jstruct", jstruct);
            if (jstruct.results && jstruct.results.length > 0 &&
                jstruct.results[0].hasOwnProperty("name") && jstruct.results[0].hasOwnProperty("email")) {
                admin = {
                    name: jstruct.results[0].name,
                    email: jstruct.results[0].email
                };
                console.log(admin);
                submitTicket(contents, ctx, contentsObj, admin);
            } else {
                if (jstruct.error) {
                    ctx.done(null, {error: "Fetching admin failed."});
                    console.log("fetching fails");
                } else {
                    submitTicket(contents, ctx, contentsObj);
                }
            }
        } catch (error) {
            console.log("fetching admin error", error);
            ctx.done(null, {error: "Fetching admin failed."});
        }
    });
}

function submitTicket(contents, ctx, contentsObj, admin) {
    var customerName = JSON.stringify(contentsObj.userIdName).replace(/'/g, "\\u0027");
    var customerId = contentsObj.userIdUnique;
    var subject = getContentSubject(contentsObj);
    var isNew = (contentsObj.ticketId === null);
    var trunContents = stripLogsAndKey(contents); // Remove logs to make ticket smaller
    //trunContents = encodeURIComponent(trunContents);
    trunContents = JSON.stringify(trunContents).replace(/'/g, "\\u0027");
    //trunContents = trunContents.replace(/'/g, "\\u0027");
    var email = "xi@xcalar.com";
    //if (isValidEmail(customerName)) {
    if (admin && admin.email) {
        email = admin.email;
    }
    var url;
    var method;
    if (isNew) {
        url = "https://myxcalar.zendesk.com/api/v2/tickets.json";
        method = "POST";
    } else {
        url = "https://myxcalar.zendesk.com/api/v2/tickets/" + contentsObj.ticketId + ".json";
        method = "PUT";
    }
    var severityStr = getSeverityStr(contentsObj.severity);
    var cmd = 'curl ' + url + ' ' +
               '-d \'{"ticket": {"requester": {"name": ' + customerName +
               ', "email": "' + email + '"}, ' + severityStr +
               '"tags":["xcuser-' + customerId + '"], ';
    if (isNew) {
        cmd += '"subject": ' + subject + ', ';
    }
    cmd += '"comment": { "body": ' +
               trunContents + ' }}}\' -H "Content-Type: application/json" -v ' +
               '-u dshetty@xcalar.com/token:5b4NoJkwc36w2BRww0H9FQjdhXbZpnaLfrr7oZej -X ' + method;

    var out = cp.exec(cmd);
    console.log(cmd);

    var stringifiedStruct = "";
    out.stdout.on("data", function(data) {
        stringifiedStruct += data;
    });
    out.on('close', function() {
        console.log("closed");
        console.log(stringifiedStruct);
        try {
            var jstruct = JSON.parse(stringifiedStruct);
            if (jstruct.ticket) {
                console.log("Success!");
                pushToSNS(contents, ctx, jstruct.ticket, admin);
                return;
            } else {
                if (jstruct.error) {
                    console.log("Error:");
                    pushToSNS(contents, ctx, "Failed");
                    ctx.done(null, {error: "Creating ticket failed."});
                }
            }
        } catch (error) {
            console.log("ticket creation error");
            console.log(error);
            ctx.done(null, {error: "Creating ticket failed."});
        }
    });
}

function pushToSNS(contents, ctx, ticket, admin) {
    var sns = new aws.SNS();
    var message;
    if(ticket == "Failed") {
        message = "Ticket creation failed. Here is the content of your ticket:\n" + contents;
    } else {
        message = "To reply to ticket, go to: https://myxcalar.zendesk.com/agent/tickets/" + ticket.id + "\n" + contents;
    }
    /*sns.publish({
        Message: message,
        TopicArn: 'arn:aws:sns:us-west-2:559166403383:zendesk-topic'
    }, function (err, data) {
        if (err) {
            console.log(err.stack);
            ctx.done(err, "Finished with Errors when pushing to SNS!");
            return;
        }
        console.log("push sent");
        console.log(data);
        if(ticket == "Failed") {
            ctx.done(null, {error: "Creating ticket failed."});
        } else {
            fetchAdmins(ticket, ctx);
        }
    });*/
    if (admin && admin.hasOwnProperty("email")) {
        ctx.done(null, {ticketId: ticket.id, admin: admin.email});
    } else {
        ctx.done(null, {ticketId: ticket.id, admin: "No admin"});
    }
}

function getSeverityStr(severity) {
    var severityStr = "";
    switch (severity) {
        case (1):
            severityStr = "urgent";
            break;
        case (2):
            severityStr = "high";
            break;
        case (3):
            severityStr = "normal";
            break;
        case (4):
            severityStr = "low";
            break;
        default:
            break;
    }

    if (severityStr) {
        severityStr = ' "priority": "' + severityStr + '", ';
    }

    return severityStr;
}

function getContentSubject(contentsObj) {
    var subject = "Ticket from " + contentsObj.userIdName;
    if (contentsObj.fromChat) {
        if (contentsObj.triggerPd) {
            subject = "LiveChat " + subject;
        } else {
            subject = "LiveChat(noPD) " + subject;
        }
    } else {
        if (contentsObj.subject && contentsObj.subject.length) {
            subject = contentsObj.subject;
        }
    }
    subject = JSON.stringify(subject).replace(/'/g, "\\u0027");
    console.log("subject");
    console.log(subject);
    return subject;
}