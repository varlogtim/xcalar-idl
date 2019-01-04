// if using in browser, make sure to include assets/lang/en/globalAutogen.js
// with <script tag

var autogenVars = (typeof window === 'undefined' && typeof require !== 'undefined') ? require('./../lang/en/globalAutogen.js') : window.autogenVars;

XPEStr = {
    "prodname": autogenVars.prodName
};
