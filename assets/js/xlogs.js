window.XLogs = (function(XLogs) {
    XLogs.getRecentLogs = function(requireLineNum) {
        var str = {"requireLineNum" : requireLineNum};
        $.ajax({
            type: 'POST',
            data: JSON.stringify(str),
            contentType: 'application/json',
            url: "https://authentication.xcalar.net/app/recentLogs",
            success: function(data) {
                ret = data;
                if (ret.status === Status.Ok) {
                    console.log('success');
                    console.log(ret.logs);
                } else if (ret.status === Status.Error) {
                    alert('Fail');
                    console.log('return error',ret.message);
                } else {
                    console.log('shouldnt be here');
                }

            },
            error: function(error) {
                console.error(error);
            }
        });
    }
    return (XLogs);
}({}));