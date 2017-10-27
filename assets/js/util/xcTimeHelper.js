window.xcTimeHelper = (function(xcTimeHelper) {
	moment.relativeTimeThreshold('s', 8);
    moment.relativeTimeThreshold('m', 55); // test

    xcTimeHelper.resetMoment = function() {
    	moment.updateLocale('en', {
	        calendar : {
	            lastDay : '[Yesterday] LT',
	            sameDay : '[Today] LT',
	            nextDay : '[Tomorrow] LT',
	            // lastWeek : '[last] dddd LT',
	            lastWeek : 'dddd LT',
	            nextWeek : 'dddd LT',
	            sameElse : 'll'
	        }
	    });
    };

    // returns tooltip string for dates
    // date can be date timestamp or moment object
    xcTimeHelper.getDateTip = function(date, options) {
        options = options || {};
    	if (typeof date !== "object" || !date._isAMomentObject) {
    		date = moment(date);
    	}
        var container = "body" || options.container;
    	date = date.format("h:mm:ss A M-D-Y");
    	return ' data-toggle="tooltip" data-placement="top" ' +
                      'data-container="' + container +
                      '" data-original-title="' + date + '" ';
    };

    xcTimeHelper.resetMoment();

    return xcTimeHelper;
}({}));