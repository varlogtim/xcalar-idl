window.Compatible = (function($, Compatible) {
    window.isBrowserMicrosoft = false;
    window.isBrowserEdge = false;
    window.isBrowserIE = false;
    window.isBrowseChrome = false;
    window.isBrowseFireFox = false;
    window.isBrowserSafari = false;
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

        // custom
        if (!String.prototype.trimLeft) {
            String.prototype.trimLeft = function () {
                return String(this).replace(/^\s+/, '');
            };
        }

        // custom
        if (!String.prototype.trimRight) {
            String.prototype.trimRight = function() {
                return String(this).replace(/\s+$/, '');
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
        if (!Number.prototype.isInteger) {
            Number.isInteger = function(value) {
                return (typeof value === "number" &&
                        isFinite(value) &&
                        Math.floor(value) === value);
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
        if (!Array.prototype.map) {
            Object.defineProperty(Array.prototype, "map", {
                enumerable  : false,
                writable    : false,
                configurable: false,
                value       : function(callback, thisArg) {
                    var T, A, k;

                    if (this == null) {
                        throw new TypeError(' this is null or not defined');
                    }

                    // 1. Let O be the result of calling ToObject passing the |this|
                    //    value as the argument.
                    var O = Object(this);

                    // 2. Let lenValue be the result of calling the Get internal
                    //    method of O with the argument "length".
                    // 3. Let len be ToUint32(lenValue).
                    var len = O.length >>> 0;

                    // 4. If IsCallable(callback) is false, throw a TypeError exception.
                    // See: http://es5.github.com/#x9.11
                    if (typeof callback !== 'function') {
                        throw new TypeError(callback + ' is not a function');
                    }

                    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
                    if (arguments.length > 1) {
                        T = thisArg;
                    }

                    // 6. Let A be a new array created as if by the expression new Array(len)
                    //    where Array is the standard built-in constructor with that name and
                    //    len is the value of len.
                    A = new Array(len);

                    // 7. Let k be 0
                    k = 0;

                    // 8. Repeat, while k < len
                    while (k < len) {
                        var kValue, mappedValue;

                        // a. Let Pk be ToString(k).
                        //   This is implicit for LHS operands of the in operator
                        // b. Let kPresent be the result of calling the HasProperty internal
                        //    method of O with argument Pk.
                        //   This step can be combined with c
                        // c. If kPresent is true, then
                        if (k in O) {
                        // i. Let kValue be the result of calling the Get internal
                        //    method of O with argument Pk.
                            kValue = O[k];

                            // ii. Let mappedValue be the result of calling the Call internal
                            //     method of callback with T as the this value and argument
                            //     list containing kValue, k, and O.
                            mappedValue = callback.call(T, kValue, k, O);

                            // iii. Call the DefineOwnProperty internal method of A with arguments
                            // Pk, Property Descriptor
                            // { Value: mappedValue,
                            //   Writable: true,
                            //   Enumerable: true,
                            //   Configurable: true },
                            // and false.

                            // In browsers that support Object.defineProperty, use the following:
                            // Object.defineProperty(A, k, {
                            //   value: mappedValue,
                            //   writable: true,
                            //   enumerable: true,
                            //   configurable: true
                            // });

                            // For best browser support, use the following:
                            A[k] = mappedValue;
                        }
                        // d. Increase k by 1.
                        k++;
                    }

                    // 9. return A
                    return A;
                }
            });
        }

        if (!Array.prototype.includes) {
            Object.defineProperty(Array.prototype, "includes", {
                enumerable  : false,
                writable    : false,
                configurable: false,
                value       : function(searchElement) {
                    'use strict';
                    if (this == null) {
                        throw new TypeError('Array.prototype.includes called on null or undefined');
                    }

                    var O = Object(this);
                    var len = parseInt(O.length, 10) || 0;
                    if (len === 0) {
                        return false;
                    }
                    var n = parseInt(arguments[1], 10) || 0;
                    var k;
                    if (n >= 0) {
                        k = n;
                    } else {
                        k = len + n;
                        if (k < 0) {k = 0;}
                    }
                    var currentElement;
                    while (k < len) {
                        currentElement = O[k];
                        if (searchElement === currentElement ||
                            (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                            return true;
                        }
                        k++;
                    }
                    return false;
                }
            });
        }
    }

    function browserCheck() {
        var userAgent = navigator.userAgent;
        if (/MSIE 10/i.test(userAgent)) {
           // this is internet explorer 10
            window.isBrowserMicrosoft = true;
            window.isBrowserIE = true;
        }

        if (/MSIE 9/i.test(userAgent) || /rv:11.0/i.test(userAgent)) {
            // this is internet explorer 9 and 11
            window.isBrowserMicrosoft = true;
            window.isBrowserIE = true;
        }

        if (/Edge/i.test(userAgent)) {
           // this is Microsoft Edge
            window.isBrowserMicrosoft = true;
            window.isBrowserEdge = true;
            $('html').addClass('edge');
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

        if (/safari/i.test(userAgent) && !window.isBrowseChrome) {
            window.isBrowserSafari = true;
        }
    }

    function systemCheck() {
        if (/MAC/i.test(navigator.platform)) {
            window.isSystemMac = true;
        }
    }

    return (Compatible);
}(jQuery, {}));
