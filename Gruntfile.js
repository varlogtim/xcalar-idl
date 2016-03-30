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
    "datastoreDemo1.html": "assets/htmlFiles/walk/datastoreDemo1.html",
    "datastoreDemo2.html": "assets/htmlFiles/walk/datastoreDemo2.html",
    "workbookDemo.html": "assets/htmlFiles/walk/workbookDemo.html",
    "login.html": "assets/htmlFiles/login.html",
    "installerLogin.html": "assets/htmlFiles/installerLogin.html",
    "dologout.html": "assets/htmlFiles/dologout.html",
    "setup.html": "assets/htmlFiles/setup.html",
    "tableau.html": "assets/htmlFiles/tableau.html"
};

count = 0
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

    watch: {
      render: {
        files: ['site/**/*.html', '!' + tmpDest + '/index.html'],
        tasks: ['includes', 'template', 'clean', 'prettify'],
        options: {
          atBegin: true,
        }
      },
      grunt: {
        files: ['Gruntfile.js', 'package.json']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-prettify');

  grunt.registerTask('html', ['includes']);
  grunt.registerTask('template', function() {
    render(tmpDest, destMap);
  });

  grunt.registerTask("render", ['html', 'template', 'clean', 'prettify']);
};