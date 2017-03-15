render = require('./site/scripts/render.js');
genCtor = require('./site/scripts/genConstructor.js');
tmpDest = 'site/tmp';
prettifyOptions = {
  options: {
    wrap_line_length: 80,
    preserve_newlines: true,
    max_preserve_newlines: 2
  }
};

destMap = {
    "index.html": "index.html",
    "unitTest.html": "unitTest.html",
    "datastoreTut1.html": "assets/htmlFiles/walk/datastoreTut1.html",
    "datastoreTut1DemoMode.html": "assets/htmlFiles/walk/datastoreTut1DemoMode.html",
    "datastoreTut2.html": "assets/htmlFiles/walk/datastoreTut2.html",
    "workbookTut.html": "assets/htmlFiles/walk/workbookTut.html",
    "login.html": "assets/htmlFiles/login.html",
    "dologout.html": "assets/htmlFiles/dologout.html",
    "tableau.html": "assets/htmlFiles/tableau.html",
    "install.html": "install.html",
    "dashboard.html": "dashboard.html",
    "testSuite.html": "testSuite.html",
    "undoredoTest.html": "undoredoTest.html",
    "extensionUploader.html": "assets/htmlFiles/extensionUploader.html"
};

var noPrettify = ["datastoreTut1.html", "datastoreTut1DemoMode.html", "datastoreTut2.html", "workbookTut.html"];

htmlMinOptions = {};

count = 0;
for (var src in destMap) {
  var dest = destMap[src];
  if (noPrettify.indexOf(src) === -1) {
    prettifyOptions["html" + count] = {
      "src": dest,
      "dest": dest
    };
    count++;
  }

  htmlMinOptions[dest] = dest;
}

module.exports = function(grunt) {

  grunt.initConfig({
    // tags is for dev use only
    tags: {
      index: {
        src: ['assets/dev/**/*.js', 'assets/dev/**/*.css'],
        dest: 'index.html'
      },
      login: {
        src: ['assets/dev/**/*.js', 'assets/dev/**/*.css'],
        dest: destMap["login.html"]
      }
    },

    clean: {
      render: {
        src: [tmpDest]
      }
    },

    includes: {
      files: {
        src: ['site/*.html'], // Source files
        dest: tmpDest, // Destination directory
        flatten: true,
        cwd: '.',
        options: {
          silent: true
        }
      }
    },


    htmlmin: {                                     // Task
      dist: {                                      // Target
        options: {                                 // Target options
          removeComments: true,
          collapseWhitespace: true,
          preserveLineBreaks: true
        },
        // files: {                                   // Dictionary of files
        //   'index.html': 'index.html',     // 'destination': 'source'
        // }
        files: htmlMinOptions
      }
    },

    less: {
      dev: {
        files: {
          'assets/stylesheets/css/style.css': 'assets/stylesheets/less/style.less',
          'assets/stylesheets/css/login.css': 'assets/stylesheets/less/login.less',
          'assets/stylesheets/css/mcf.css': 'assets/stylesheets/less/mcf.less',
          'assets/stylesheets/css/installer.css': 'assets/stylesheets/less/installer.less',
          'assets/stylesheets/css/dashboard.css': 'assets/stylesheets/less/dashboard.less',
          'assets/stylesheets/css/xu.css': 'assets/stylesheets/less/xu.less',
          'assets/stylesheets/css/testSuite.css': 'assets/stylesheets/less/testSuite.less'
        }
      }
    },

    prettify: prettifyOptions,

    customWatch: {
      normal: {
        files: ['site/**/*.html', '!' + tmpDest + '/index.html', 'Gruntfile.js', 'package.json'],
        tasks: ['includes', 'template', 'clean', 'tags', 'htmlmin', 'prettify'],
        options: {
          atBegin: true,
        }
      },

      withReload: {
        options: {
          livereload: true
        },
        files: ['assets/stylesheets/css/**/*.css', 'assets/js/**/*.js', 'index.html', "assets/htmlFiles/login.html"]
      },
      withReloadCssOnly: {
        options: {
          livereload: true
        },
        files: ['assets/stylesheets/css/**/*.css']
      },
      less: {
        files: ['assets/stylesheets/less/**/*.less'],
        tasks: ['less'],
        options: {
          atBegin: true,
        }
      },
    },

    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      set1: ['customWatch:withReload', 'customWatch:normal'],
      set2: ['customWatch:withReloadCssOnly', 'customWatch:normal'],
      set3: [ 'customWatch:normal', 'customWatch:less'],
      set4: ['customWatch:withReload', 'customWatch:normal', 'customWatch:less'],
      set5: ['customWatch:withReloadCssOnly', 'customWatch:normal','customWatch:less'],
    },

    exec: {
      expServer: 'node_modules/istanbul/lib/cli.js cover node_modules/mocha/bin/_mocha services/test/expServerSpec/**/*.spec.js services/expServer/*.js --dir services/test/report'
    }
  });

  grunt.loadNpmTasks('grunt-script-link-tags');

  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-prettify');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-exec');

  grunt.registerTask('html', ['includes']);
  grunt.registerTask('template', function() {
    render(tmpDest, destMap);
  });

  grunt.registerTask('version', function() {
    genCtor("assets/js/constructor/test.js");
  });

  grunt.renameTask('watch', 'customWatch');
  grunt.registerTask("watch", ['customWatch:normal']);
  grunt.registerTask("reload", ['concurrent:set1']);
  grunt.registerTask("reloadCSS", ['concurrent:set2']);
  grunt.registerTask("watchLess", ['concurrent:set3']);
  grunt.registerTask("reloadLess", ['concurrent:set4']);
  grunt.registerTask("reloadCSSLess", ['concurrent:set5']);

  // used for prod
  grunt.registerTask("render", ['html', 'template', 'clean', 'htmlmin', 'prettify']);

  // used for dev
  grunt.registerTask("dev", ['html', 'template', 'clean', 'tags', 'htmlmin', 'prettify']);
  grunt.registerTask("test", ['exec:expServer']);
};
