render = require('./site/render.js');
tmpDest = 'site/tmp';

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

    prettify: {
      options: {
      },
      one: {
        src: 'index.html',
        dest: 'index.html'
      },
      two: {
        src: 'assets/htmlFiles/walk/datastoreDemo1.html',
        dest: 'assets/htmlFiles/walk/datastoreDemo1.html'
      },
      three: {
        src: 'assets/htmlFiles/walk/datastoreDemo2.html',
        dest: 'assets/htmlFiles/walk/datastoreDemo2.html'
      },
      four: {
        src: 'assets/htmlFiles/walk/workbookDemo.html',
        dest: 'assets/htmlFiles/walk/workbookDemo.html'
      }
    },

    watch: {
      render: {
        files: ['site/**/*.html', '!' + tmpDest + '/index.html'],
        tasks: ['includes', 'template', 'clean', 'prettify'],
        options: {
          atBegin: true
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-prettify');

  grunt.registerTask('html', ['includes']);
  grunt.registerTask('template', function() {
    render(tmpDest);
  });

  grunt.registerTask("render", ['html', 'template', 'clean', 'prettify']);
};