const path = require('path');

module.exports = function(env, argv) {
    return {
        entry: "./assets/js/xcrpc/index.js",
        mode: env.production ? 'production' : 'development',
        output: {
            path: path.resolve(env.buildroot, 'assets/js/xcrpc'),
            library: 'xce',
            filename: 'libxce.js'
        },
        externals: {
            jquery: 'jQuery'
        },
    };
};
