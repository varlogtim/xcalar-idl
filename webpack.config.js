const path = require('path');

module.exports = function(env, argv) {
    const mode = env.production ? 'production' : 'development';
    return [{
                entry: path.resolve(env.buildroot, "assets/js/xcrpc/index.js"),
                mode: mode,
                output: {
                    path: path.resolve(env.buildroot, 'assets/js/xcrpc'),
                    library: 'xce',
                    filename: 'libxce.js'
                },
                externals: {
                    jquery: 'jQuery'
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
            }];
};