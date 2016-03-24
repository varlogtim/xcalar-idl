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
    }
  });

  grunt.loadNpmTasks('grunt-includes');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('html', ['includes']);
  grunt.registerTask('template', function() {
    render(tmpDest);
  });

  grunt.registerTask("render", ['html', 'template', 'clean']);
};