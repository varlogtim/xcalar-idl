render = require('./site/render.js');
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
    "datastoreDemo1.html": "assets/htmlFiles/walk/datastoreDemo1.html",
    "datastoreDemo2.html": "assets/htmlFiles/walk/datastoreDemo2.html",
    "workbookDemo.html": "assets/htmlFiles/walk/workbookDemo.html",
    "login.html": "assets/htmlFiles/login.html",
    "installerLogin.html": "assets/htmlFiles/installerLogin.html",
    "dologout.html": "assets/htmlFiles/dologout.html",
    "setup.html": "assets/htmlFiles/setup.html",
    "tableau.html": "assets/htmlFiles/tableau.html"
};

count = 0;
for (var src in destMap) {
  var dest = destMap[src];
  prettifyOptions["html" + count] = {
    "src": dest,
    "dest": dest
  };
  count++;
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

    prettify: prettifyOptions,

    customWatch: {
      normal: {
        files: ['site/**/*.html', '!' + tmpDest + '/index.html', 'Gruntfile.js', 'package.json'],
        tasks: ['includes', 'template', 'clean', 'tags', 'prettify'],
        options: {
          atBegin: true,
        }
      },
      withReload: {
        options: {
          livereload: true
        },
        files: ['assets/stylesheets/css/**/*.css', 'assets/js/**/*.js', 'index.html']
      },
      withReloadCssOnly: {
        options: {
          livereload: true
        },
        files: ['assets/stylesheets/css/**/*.css']
      }
    },
    concurrent: {
            options: {
                logConcurrentOutput: true
            },
            set1: ['customWatch:withReload', 'customWatch:normal'],
            set2: ['customWatch:withReloadCssOnly', 'customWatch:normal'],
        },

  });

  grunt.loadNpmTasks('grunt-script-link-tags');

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-prettify');
  grunt.loadNpmTasks('grunt-concurrent');

  grunt.registerTask('html', ['includes']);
  grunt.registerTask('template', function() {
    render(tmpDest, destMap);
  });

  grunt.renameTask('watch', 'customWatch');
  grunt.registerTask("watch", ['customWatch:normal']);
  grunt.registerTask("reload", ['concurrent:set1']);
  grunt.registerTask("reloadCss", ['concurrent:set2']);

  // used for prod
  grunt.registerTask("render", ['html', 'template', 'clean', 'prettify']);

  // used for dev
  grunt.registerTask("dev", ['html', 'template', 'clean', 'tags','prettify']);
};