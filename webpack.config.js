const path = require('path');

module.exports = function(env, argv) {
    const mode = env.production ? 'production' : 'development';
    return [
        {
            target: "web",
            entry: path.resolve(env.buildroot, "assets/js/xcrpc/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/xcrpc'),
                library: 'xce',
                filename: 'libxce.js'
            },
            externals: {
                jquery: 'jQuery',
                // jsdom and require-context are used for node, but not for
                // the browser. The code is designed such that these modules
                // will never be used in the browser, due to checks like
                // if (!isBrowser) require("jsdom");
                // Since they will never be used, we make webpack ignore them.
                jsdom: 'notused',
                'require-context': 'notused',
            }
        },
        {
            // We can add more to it, e.g. evalparser, etc. All of them share
            // one export target
            entry: path.resolve(env.buildroot, "assets/js/parser/index.js"),
            mode: mode,
            output: {
                path: path.resolve(env.buildroot, 'assets/js/shared/parser'),
                library: 'XDParser',
                filename: "antlrParser.js"
            },
            node: {
                module: "empty",
                net: "empty",
                fs: "empty"
            }
        }
    ];
};
