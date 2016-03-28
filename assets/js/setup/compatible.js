window.Compatible = (function($, Compatible) {
    window.isBrowserMicrosoft = false;
    window.isBrowseChrome = false;
    window.isBrowseFireFox = false;
    window.isSystemMac = false;

    Compatible.check = function() {
        stringCheck();
        browserCheck();
        systemCheck();
    };

    function stringCheck() {
        // XXX(Always Open) check if those functions are already
        // support by all browsers frequently

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

        (function(){
            if(window.console && console.error){
                var old = console.error;
                console.error = function(){
                    Array.prototype.unshift.call(arguments, '(╯°□°）╯︵ ┻━┻ ');
                    old.apply(this, arguments)
                }
            }
        })();
    }

    function browserCheck() {
        var userAgent = navigator.userAgent;
        if (/MSIE 10/i.test(userAgent)) {
           // this is internet explorer 10
            window.isBrowserMicrosoft = true;
        }

        if (/MSIE 9/i.test(userAgent) || /rv:11.0/i.test(userAgent)) {
            // this is internet explorer 9 and 11
            window.isBrowserMicrosoft = true;
        }

        if (/Edge\/12./i.test(userAgent)) {
           // this is Microsoft Edge
            window.isBrowserMicrosoft = true;
        }
        if (isBrowserMicrosoft) {
            $('html').addClass('microsoft');
        }

        if (/chrome/i.test(userAgent)) {
            window.isBrowseChrome = true;
        }

        if (/firefox/i.test(userAgent)) {
            window.isBrowseFireFox = true;
            $('html').addClass('firefox');
        }
    }

    function systemCheck() {
        if (/MAC/i.test(navigator.platform)) {
            window.isSystemMac = true;
        }
    }

    return (Compatible);
}(jQuery, {}));
