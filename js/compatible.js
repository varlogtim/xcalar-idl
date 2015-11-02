window.Compatible = (function($, Compatible) {
    // XXX check if those functions are already
    // support by all browsers frequently
    window.isBrowserMicrosoft = false;
    window.isBrowseChrome = false;

    Compatible.check = function() {
        stringCheck();
        browserCheck();
    };

    function stringCheck() {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
        if (!String.prototype.startsWith) {
            String.prototype.startsWith = function(searchString, position) {
                position = position || 0;
                return this.indexOf(searchString, position) === position;
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
        if (!String.prototype.endsWith) {
            String.prototype.endsWith = function(searchString, position) {
                var subjectString = this.toString();
                if (position === undefined || position > subjectString.length) {
                    position = subjectString.length;
                }
                position -= searchString.length;
                var lastIndex = subjectString.indexOf(searchString, position);
                return lastIndex !== -1 && lastIndex === position;
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
        if (!String.prototype.includes) {
            String.prototype.includes = function() {'use strict';
                return String.prototype.indexOf.apply(this, arguments) !== -1;
            };
        }
    }

    function browserCheck() {
        if (/MSIE 10/i.test(navigator.userAgent)) {
           // this is internet explorer 10
            window.isBrowserMicrosoft = true;
        }

        if (/MSIE 9/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent)) {
            // this is internet explorer 9 and 11
            window.isBrowserMicrosoft = true;
        }

        if (/Edge\/12./i.test(navigator.userAgent)) {
           // this is Microsoft Edge
            window.isBrowserMicrosoft = true;
        }
        if (isBrowserMicrosoft) {
            $('html').addClass('microsoft');
        }

        if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
             window.isBrowseChrome = true;
        }
    }

    // XXX add other check here is necessary

    return (Compatible);
}(jQuery, {}));
