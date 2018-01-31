/**

    @GRUNTFILE
        Uses:
            1. BUILD TOOL to generate build for xcalar-gui project,
            2. WATCH TOOL:
                To watch for changes in certain files within the project source or build,
                and if edits made to any such file, regenerate only portion of build
                relevant to the edited file and reload browser with that updated build.
                (ex. if you specify to watch all 'less' files in your project src,
                grunt will run in background, and if you change any less file,
                will re-generate CSS for less file changed)

    Basic usage:

            %> grunt <build-type> [options]   // build tool

            %> grunt watch [options] // watch tool

            %> grunt <build-type> watch [options] // build and then watch

    valid <build-type>:

        dev
            for front end developers - will generate a working build
            but no javascript minification and config details remain
            Build output, unless otherwise specified via cmd params,
            will be in <xlr src>

        debug
            run by Jenkins - this is a regular default build that can
            be debugged, only developer config details are removed so
            the build doesn't get connected to developer server
            Build output, unless otherwise specified via cmd params,
            will be in <xlr src>/xcalar-gui/<product>

        installer
            full shippable build.
            js is minified and developer config details removed
            Build output, unless otherwise specified via cmd params,
            will be in <xlr src>/xcalar-gui/<product>

        trunk
            for backend developers - will generate a working build,
            but port in developer's own backend thrift changes, and
            sync back and front end for communication
            Build output, unless otherwise specified via cmd params,
            will be in <xlr src>/xcalar-gui/<product>

    [options]:

        --xcalarguiroot=<path>

            Root dir of xcalar-gui project to build from
            if not supplied, defaults to cwd of Gruntfile

        --product=[XD|XI]

            Which product type to build? Optional; default to XD.

        --timestampbuild

            If this flag given, will generate a dir of current timestamp, and bld will go in there.
            (Useful if you want to store builds in a central location, and for testing
            this Gruntfile out)

        --buildrootdir=<path>

            Dir you want top-level build output to be rooted at
            (not necessarily where index.html begins)
            It relative, will be relative to xcalar-gui src
            If not supplied, defaults to: <xcalarguiroot>

        --buildstartdir=<path>

            Dir you want build output directory holding index.html
            If relative, will be relative to <buildrootdir>
            If not supplied, defaults to:
                <buildrootdir> (for all dev blds)
                <buildrootdir>/xcalar-gui (for non-dev XD blds)
                <buildrootdir>/xcalar-insight (for non-dev XI blds)

        --settopbldroottosrc

            sets <buildrootdir> to <xcalarguiroot>

        --setdesttoroot

            sets <buildstartdir> to <xcalarguiroot>
            (and thus, also <buildrootdir> to <xcalarguiroot>)

        --nooverwrite

            If this flag given, if there is already a directory at build output location,
            will exit.  Otherwise it will overwrite that.  Default is to overwrite.

        --rc / --removedebugcomments    // installer blds only

            If this flag passed, will remove code blocks between debug tags in javascript
            files prior to js minification.
            (see method removeDebug for more info)

    OPTIONS ONLY FOR WATCH:

        --type=<comma sep. list of FILETYPE(s)>

            Watch for changes in files of the specified FILETYPE(s).
            (If list begins with '-' will watch for chnages in all filetypes EXCEPT what is listed.)

            FILETYPES:
                all                    any src or bld filel
                less                   any less src file
                css                    any css bld file
                html                   any html src file
                htmlbld                any html bld file
                js                     any js src file
                constructors           changes in site/render/template/constructor.template.js

            ex.:
                grunt watch --type=less,css        (watches for changes in any files of FILETYPE less or css)
                grunt watch --type=-less,css    (watches for changes in any files of FILETYPE other than less or css)

            Each FILETYPE can be its own standalone boolean flag, too, indicating to WATCH files of that type

            ex.:
                grunt watch --less --css        (watches for changes in any files of FILETYPE less or css)

        --file=<a specific filepath>

        --files=<comma sep. list of specific filepaths to watch>

        --dir=<a specific dir>

            Watches for changes of ANY files nested anywehre within the dir

        --dirs=<comma sep. list of specific dirs to watch>

        --common

            Flag to watch for some common files (grep for COMMON_WATCH_SRC_FILES and COMMON_WATCH_BLD_FILES
            at top of script to see which currently)

        --commonDirs

            Flag to watch for changes in files nested within some common dirs (grep for COMMON_WATCH_SRC_DIRS
            and COMMON_WATCH_BLD_DIRS)

        --livereload

            If given as a boolean flag, will do livereload of the browser, after completing
            watch tasks for ANY watched file that gets edited.

        --livereload=<comma sep. list of FILETYPE(s)>

            Do livereload only on files of the given types.
            (if list begins with '-', will livereload on a file of any valid FILETYPE except what is specified)
            ** TO GET LIVERELOAD PROPERTY TO WORK, please install the 'livereload' chrome plugin.

        --relTo=[SRC|BLD]

            if --file, --files, --dir, or --dirs specified as rel. paths,
            will indicates weather to resolve from the project src, or the build src.

    Built in Grunt options:

        --v/--verbose

            If flag given, will display more log messages

        --f/--force

            If flag given, then if a task fails, subsequent tasks will be run still.
            (Default is to hault all queued tasks if one task in the queue fails)

    Examples:

        grunt dev                 (build a dev build of XD product, in to <xclrdir>)
        grunt dev --product XI    (build a dev build of XI product, in to <xclrdir>)
        grunt installer           (build installer flavor of XD product, in to <xclrdir>/xcalar-gui/)
        grunt debug watch --less  (build a debug build in to <xlrdir>/xcalar-gui, then watch for changes in all less files in <xlrdir> that aren't bld files)

        grunt debug watch --less --livereload

            build a debug build, then watch project src for any chnages to less files.
            If any less file is edited, rebuild it in to the build and reload the browser.

        grunt debug watch --types=-css --livereload=less

            build a debug build, then for changes in any file of any valid FILETYPE,
            except for css files.
            and livereload the browser after completing watch tasks, only if edited file was a less file.

        grunt watch --xcalarguiroot=/home/jolsen/xcalar-gui --less --html --livereload=-less

            In an existing gui build, with src root at --xcalarguiroot, and bld output at
            default location (since no --buildoutput given; see --buildoutput description above
            to see what default would be),
            Watch for chnages of any less or project src html files in an existing project.
            If changed, rebuild the file in to the build and livereload if it was a FILETYPE
            other than less

        grunt watch --buildoutput=/home/jolsen/xcalar-gui/out --less --html --livereload=-less

            Just as example above, only the existing project has its build at --buildoutput,
            and the project src will be the location script running from (since no --xcalarguiroot given)

        grunt --xcalarguiroot=/home/jolsen/cleanRepo/guiproj/ --buildoutput=/home/jolsen/xcalar-gui/bldGruntFile/dom5/ debug --v

            bld debug build from project at --xcalarguiroot, bld destination is at --buildoutput and with verbosity
*/

/**
    Global Path variables should end in '/' (or OS path sep.)
*/
var fs = require('fs'); // for file system operations
var os = require('os'); // for getting hostname for thrift sync
var shell = require('shelljs');
_ = require('underscore');
const path = require('path');
var cheerio = require('cheerio');

var XD = "XD";
var XI = "XI";
var XDprodName = "xcalar-gui";
var XIprodName = "xcalar-insight";

// names of main bld tasks user can call from cmd line i.e., 'grunt debug'
var TRUNK = "trunk",
    INSTALLER = "installer",
    DEV = "dev", // if they don't supply any task, default will get run automatically; but they can specify default to
    DEBUG = "debug";

// the custom tasks in this Gruntfile used by build tasks
var PREP_BUILD_DIRS = 'prepBuildDirs',
    BUILD = 'build',
    BUILD_CSS = 'buildCSS',
    CLEAN_CSS_SRC = 'cleanCssSrc',
    BUILD_HTML = 'buildHTML',
    TEMPLATE_HTML = 'templateHTML',
    PROCESS_HTML = 'processHTML',
    CLEAN_HTML_SRC = 'cleanHTMLSrc',
    MINIFY_JS = "minifyJs",
    REMOVE_JS_DEBUG_COMMENTS = 'removeDebugComments',
    CLEAN_JS_SRC_POST_MINIFICATION = 'cleanJsSrc',
    UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME = 'updateEssentialJsFilesWithCorrectProductName',
    UPDATE_SCRIPT_TAGS = 'updateScriptTags',
    CHECK_FOR_XD_STRINGS = 'checkForXDStrings',
    HELP_CONTENTS = 'helpContents',
    GENERATE_HELP_STRUCTS_FILE = 'generateHelpStructsFile',
    GENERATE_HELP_SEARCH_INSIGHT_FILE = 'generateHelpSIFile',
    CLEANUP_HELP_CONTENT_DIR = 'cleanupHelpContentDir',
    CONSTRUCTOR_FILES = 'constructorFiles',
    GENERATE_GIT_VAR_DEC_FILE = 'generateGitVarDecFile',
    GENERATE_CURR_PERS_CONSTRUCTOR_FILE = 'generateCurrPersConstructorFile',
    CLEAN_CONSTRUCTOR_SRC = 'cleanConstructorSrc',
    SYNC_WITH_THRIFT = 'syncWithThrift',
    NEW_CONFIG_FILE = 'newConfigFile',
    CLEAN_BUILD_SECTIONS = 'cleanBldSections',
    FINALIZE = 'finalize',
    DISPLAY_SUMMARY = 'summary';
// custom tasks for watch
var COMPLETE_WATCH = 'completeWatch';

// Global booleans to indicate if current process is for bld task or 'watch' functionality (could be both)
var IS_BLD_TASK = false;
var IS_WATCH_TASK = false;

/**
    MAPPINGS FOR INIDVIDUAL FILE TYPES
    Used as follows in this Gruntfile:
        src: directory path within project src where files to be generated are rooted at
        dest: directory path within bld you want the genrated files of that type to be rooted at
        remove: files/dirs to exclude from bld entirely (old legacy files you dont need for any reason)
            should be rel. to 'src' attribute above (since you're saying, within the src, don't use these at all)
            can use globbing patterns
            >> Globbing patterns here only are UNIX globbing patterns, not Grunt!  (because these will be
            tacked on to the initial rsync command, and grunt-rsync uses the Unix globs!!,
        exclude: files/dirs you want to exclude from generating, but keep as standalone files in bld
            (ex. 3rd party js files, that you don't want to minify, but still want them in bld)
        required: dirs/files required only for the purpose of generating bld files, so want synced in to bld
            for purpose of bld generation, but removed on cleanup

*/
var constructorMapping = {
    src: 'assets/js/constructor/xcalar-idl/xd/',
    files: '*',
    dest: 'assets/js/constructor/',
    exclude: [],
    remove: ['**README'], // remove README files in the constructor src; dont need them and if you don't you'll end up with empty dirs with only READMEs
    required: ['site/render/']};
var cssMapping = {
    src: 'assets/stylesheets/less/',
    files: '*.less',
    dest: 'assets/stylesheets/css/',
    exclude: [],
    remove: ['userManagement.less', 'xu.less', 'dashboard.less'], // old files; don't need these
    required:['assets/stylesheets/less/partials/']};
var htmlMapping = {
    src: 'site/',
    files: '**/*.html', // globbing pattern for files to get for a full bld
    dest: '',
    exclude: [],
    remove: ['dashboard.html', 'userManagement.html'],
    required: ['site/partials/', 'site/util/']};
var jsMapping = {
    src: 'assets/js/',
    files: '**/*.js',
    dest: 'assets/js/',
    exclude: [],
    remove: ['thrift/mgmttestactual.js'],
    required: []};
var helpContentRoot = "assets/help/";
var helpContentMapping = {
    src: helpContentRoot + 'user/', // starts out with XD/ and XI/ dirs in helpContentRoot, the rel. one based on build flavor only gets moved to this user/ after initial rsync
    dest: "assets/js/util/helpHashTags.js", // help contenet generated will be a single file defining some structs
    exclude: {},
    remove: [],
    required: []};

// cli options for regular bld functionality
var BLD_OP_SRC_REPO = 'xcalarguiroot',
    BLD_OP_BLDROOT = 'buildrootdir',
    BLD_OP_DESTDIR = 'buildstartdir',
    BLD_OP_PRODUCT = 'product',
    BLD_OP_BACKEND_SRC_REPO = "xcalar-bld",
    BLD_OP_JS_MINIFICATION_CONCAT_DEPTH = 'jsminificationdepth',
    BLD_FLAG_SRC_DEST_SAME = 'setdesttoroot',
    BLD_FLAG_SRC_BLD_SAME = 'settopbldroottosrc',
    BLD_FLAG_TIMESTAMP_BLDDIR = 'timestampbld',
    BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS = 'nooverwrite',
    BLD_FLAG_RETAIN_FULL_SRC = 'keepsrc',
    BLD_FLAG_RC_SHORT = 'rc',
    BLD_FLAG_RC_LONG = 'removedebugcomments';
// cli options for watch functionality
var WATCH_FLAG_ALL = "all"; // watch all files
    WATCH_FLAG_HTML_SRC = "html", // watch html src code (will need to rebld)
    WATCH_FLAG_HTML_BLD = "bldhtml", // watch the bld html (wont need to rbld)
    WATCH_FLAG_CSS = "css",
    WATCH_FLAG_CONSTRUCTORS = 'constructors',
    WATCH_FLAG_LESS = "less",
    WATCH_FLAG_JS_SRC = "js",
    WATCH_FLAG_JS_BLD = "bldJs",
    WATCH_FLAG_COMMON_SRC_FILES = "common", // watch a list of common files
    WATCH_FLAG_COMMON_SRC_DIRS = "commonDirs", // watch a list of common dirs
    WATCH_OP_WATCH_TYPES = "types",
    WATCH_OP_SINGLE_FILE = "file", // watch a single file
    WATCH_OP_MULTIPLE_FILES = "files", // spec. a comma sep list of files
    WATCH_OP_SINGLE_DIR = "dir", // single dir
    WATCH_OP_MULTIPLE_DIRS = "dirs", // spec. a comma sep list
    WATCH_OP_REL_TO = "relTo", // can be either 'SRC' or 'BLD' (if they  want to specify rel paths)
    WATCH_OP_LIVE_RELOAD = "livereload";

// delimeter user should use for cli options that can take lists
var OPTIONS_DELIM = ",";

// valid watch filetypes, and globs for collecting files of that type (globs set after reading cli options)
var WATCH_FILE_TYPES = {
    [WATCH_FLAG_HTML_SRC]: '',
    [WATCH_FLAG_HTML_BLD]: '',
    [WATCH_FLAG_CSS]: '',
    [WATCH_FLAG_LESS]: '',
    [WATCH_FLAG_JS_SRC]: '',
    [WATCH_FLAG_JS_BLD]: '',
    [WATCH_FLAG_CONSTRUCTORS]: '',
};

// the name of the constructor template file
var CONSTRUCTOR_TEMPLATE_FILE = 'constructor.template.js';
var CONSTRUCTOR_TEMPLATE_FILE_PATH_REL_BLD = 'site/render/template/' + CONSTRUCTOR_TEMPLATE_FILE;

/**
    comon files to watch
    (these should be ABS Paths, but need to get SRCROOT and DESTDIR first,
    that will get appended on during watch, so put here just rel part
*/
var COMMON_WATCH_SRC_FILES = [htmlMapping.src + "index.html", htmlMapping.src + "login.html"];
var COMMON_WATCH_SRC_DIRS = [];
var COMMON_WATCH_BLD_FILES = [];
var COMMON_WATCH_BLD_DIRS = [];

/**

        global vars FOR PARAM VALIDATION of cmd options..
        VALID_OPTIONS: keys are the valid CLI options, value is a hash specifying validation criteria for value
        Will validation options against this hash.  Create also some useful formatted strings for help and
        corrective err msgs
*/

var VALUES_KEY = "values", // the values it's limited to
    REQUIRES_ONE_KEY = 'requiresOne', // option requires at least one in a list of other options/flags
    REQUIRES_ALL_KEY = 'requiresAll', // option requires all of a particular list of other options/flags
    MULTI_KEY = 'multi', // can specify a delimeter list of values
    EXCLUSION_KEY = 'exclusion', // can specify --<option>=-<values> and it will get everything BUT what is in the list
    NAND_KEY = 'notand', // if specifying an option, can't specify a set of other options
    FLAG_KEY = 'boolflag', // if is strictly a boolean flag, and does not take any value (false would mean it can take a value)
    TYPE_KEY = 'typekey', // if it can only be a certain data type.  sorry don't have this figured out yet.
    REQUIRES_VALUE_KEY = 'takesval', // if this option requires some value assigned to it.
    // so note if it allows both - flag and option, don't supply either.
    WATCH_KEY = 'watch', // if this is an option for watch functionality
    BLD_KEY = 'bldstuff', // if this is a key for bld functionality (need in addition to watch key because could be bopth)
    DESC_KEY = 'description', // description of the option/to print to user in help menu and corrective err msgs during param validation
    IS_GRUNT_OP = 'gruntop', // if this is a build-in grunt option  (will print a general description in that case)
    // Grunt by default, 1. processes an option that's supplied as option=false as a boolean flag, --no-<option>
    // Allows user to supply --no-<flag> for any8 boolean flag.  These two keys control that.
    TAKES_BOOLS = 'nobooleans', // if this can take boolean values true/false. (because then you'll know that --no-<param> is actually valid
    NO_EXTRA_GRUNT_FLAG = 'noextra'; // if you don't want Grunt to allow a no-<param> flag for this param (it complicatrse things for the watch flags)
var falseBooleanFlagPrefix = "no-"; // the prefix Grunt adds on to the extra booleans (i.e., if you have --root=false, will store as --no-root)(
var VALID_OPTIONS = {
    [BLD_OP_SRC_REPO]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Path to the xcalar gui git repo you want to generate bld from"},
    [BLD_OP_BLDROOT]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Path to top-level dir for bld output (if does not exist will create for you)"},
    [BLD_OP_DESTDIR]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Directory path for dir in build where index.html should start (if does not exist will create for you)"},
    [BLD_OP_PRODUCT]:
        {[REQUIRES_VALUE_KEY]: true, [VALUES_KEY]: [XD,XI], [DESC_KEY]: "Product type to build"},
    [BLD_OP_BACKEND_SRC_REPO]:
        {[REQUIRES_VALUE_KEY]: true, [BLD_KEY]: true, [DESC_KEY]: "For trunk builds only: Path to xlr repo to copy in backend files from"},
    [BLD_OP_JS_MINIFICATION_CONCAT_DEPTH]:
        {[REQUIRES_VALUE_KEY]: true, [DESC_KEY]: "Depth to start minifying js files from within " + jsMapping.src},
    [WATCH_OP_SINGLE_FILE]:
        {[REQUIRES_VALUE_KEY]: true, [WATCH_KEY]: true, [DESC_KEY]: "Path to single file you'd like to watch"},
    [WATCH_OP_MULTIPLE_FILES]:
        {[REQUIRES_VALUE_KEY]: true, [WATCH_KEY]: true, [DESC_KEY]: "Comma sep list of filepaths of files you'd like to watch"},
    [WATCH_OP_SINGLE_DIR]:
        {[REQUIRES_VALUE_KEY]: true, [WATCH_KEY]: true, [DESC_KEY]: "Path to directory of files you'd like to watch"},
    [WATCH_OP_MULTIPLE_DIRS]:
        {[REQUIRES_VALUE_KEY]: true, [WATCH_KEY]: true, [DESC_KEY]: "Comma sep list of directory paths to watch files in"},
    [WATCH_OP_REL_TO]:
        {[REQUIRES_VALUE_KEY]: true, [REQUIRES_ONE_KEY]: [WATCH_OP_SINGLE_FILE, WATCH_OP_MULTIPLE_FILES, WATCH_OP_SINGLE_DIR, WATCH_OP_MULTIPLE_DIRS], [WATCH_KEY]: true,
        [DESC_KEY]: "If rel filepaths supplied for watch files, which dir to get them rel to (defaults to project source)"},
    [WATCH_OP_WATCH_TYPES]:
        {[REQUIRES_VALUE_KEY]: true, [VALUES_KEY]: Object.keys(WATCH_FILE_TYPES), [MULTI_KEY]:true, [EXCLUSION_KEY]:true, [WATCH_KEY]: true,
        [DESC_KEY]: "A single filetype, or comma sep list of filetypes you'd like to watch.  "
            + "\n\t\tIf list starts with -, will watch all types EXCEPT that/those specified.  "},
    [WATCH_OP_LIVE_RELOAD]: // can be used as a flag or an option
        {//[REQUIRES_VALUE_KEY]: true,
        [VALUES_KEY]: Object.keys(WATCH_FILE_TYPES), [MULTI_KEY]:true, [EXCLUSION_KEY]:true, [WATCH_KEY]: true,
        [DESC_KEY]: "As flag: do live reload on all watched files."
            + "\n\t\tAs option: A single filetype, or comma sep list of filetypes you'd like to do live reload on. "
            + "\n\t\tIf list begins with -, will do livereload on all types EXCEPT that/those specififed."},
    // flags
    [BLD_FLAG_TIMESTAMP_BLDDIR]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Creates int. dir for bld output, which is timestamp when bld begins"},
    [BLD_FLAG_SRC_BLD_SAME]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Make top-level build output same as source directory of xlr gui project"},
    [BLD_FLAG_SRC_DEST_SAME]:
        {[FLAG_KEY]: true, [NAND_KEY]: [falseBooleanFlagPrefix + BLD_FLAG_SRC_BLD_SAME], [DESC_KEY]: "Make dir where index.html exists in bld output, sasme as source dir of xlr gui project"},
    [BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Do NOT overwrite build directory if it exists"},
    [BLD_FLAG_RETAIN_FULL_SRC]:
        {[FLAG_KEY]: true, [DESC_KEY]: "In the final build, do NOT delete/clean up files used only for build generation (i.e., partials, untemplated files, etc.)"},
    [BLD_FLAG_RC_SHORT]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Remove debug comments from javascript files when generating build"},
    [BLD_FLAG_RC_LONG]:
        {[FLAG_KEY]: true, [DESC_KEY]: "Remove debug comments from javascript files when generating build"},
    // watch flags
    [WATCH_FLAG_ALL]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in files of all filetypes"},
    [WATCH_FLAG_HTML_SRC]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in html files in the project source @ " + htmlMapping.src + ", and regen in to bld"},
    [WATCH_FLAG_HTML_BLD]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in html in the build"},
    [WATCH_FLAG_CSS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in css files in the build (ignore this for now because livereload bug won't reload css)"},
    [WATCH_FLAG_LESS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in less files in the project source @ " + cssMapping.src},
    [WATCH_FLAG_JS_SRC]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in javascript files in project source @ " + jsMapping.src},
    //[WATCH_FLAG_JS_BLD]: {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in },
    [WATCH_FLAG_CONSTRUCTORS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in " + CONSTRUCTOR_TEMPLATE_FILE_PATH_REL_BLD + " and re-gen constructor file(s) as result"},
    [WATCH_FLAG_COMMON_SRC_FILES]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes in some common files in the project source: " + COMMON_WATCH_SRC_FILES},
    [WATCH_FLAG_COMMON_SRC_DIRS]:
        {[FLAG_KEY]: true, [WATCH_KEY]: true, [NO_EXTRA_GRUNT_FLAG]: true, [DESC_KEY]: "Watch for changes for files in some common directories in the project source: " + COMMON_WATCH_SRC_DIRS},
};

// add in grunt options/flags you want available to user (grunt --version works even if you don't add here)
var GRUNT_OPTIONS = [
    'gruntfile', 'debug', // even though --debug a boolean flag, grunt stores it internally as debug=1 (value taking)
];
var GRUNT_FLAGS = [
    'verbose', 'force', 'stack',
];
var validOp;
for ( validOp of GRUNT_OPTIONS ) {
    VALID_OPTIONS[validOp] = {[REQUIRES_VALUE_KEY]: true, [IS_GRUNT_OP]: true};
}
for ( validOp of GRUNT_FLAGS ) {
    VALID_OPTIONS[validOp] = {[FLAG_KEY]: true, [IS_GRUNT_OP]: true};
}

/**
    Grunt will take any <option> that user specifies as 'false',
    and store it in grunt.options as '--no-' + <option>
    (ex: if you pass --optionA=false on cmd, instead of storing this
    in grunt.options as 'optionA':'false' (which is how Grunt stores other options),
    will store it in grunt.options as a boolean flag, as 'no-optionA')
    So, for any cmd option capable of taking 'false' as a value,you
    need to account for this boolean flag version of the option as a valid option too
*/
var oppOp;
for ( validOp of Object.keys(VALID_OPTIONS) ) {
    oppOp = falseBooleanFlagPrefix + validOp;
    if ( VALID_OPTIONS[validOp][TAKES_BOOLS] ||
        (VALID_OPTIONS[validOp][FLAG_KEY] && !VALID_OPTIONS[validOp][NO_EXTRA_GRUNT_FLAG])
    ) {
        VALID_OPTIONS[oppOp] = {[FLAG_KEY]: true};
        if ( VALID_OPTIONS[validOp][IS_GRUNT_OP] ) {
            VALID_OPTIONS[oppOp][IS_GRUNT_OP] = true;
        }
        else {
            VALID_OPTIONS[oppOp][DESC_KEY] = "Negation of: " + VALID_OPTIONS[validOp][DESC_KEY];
        }
    }
}

/**
    invert VALID_OPTIONS param validation hash,
    to get useage/help strings per type (i.e., flags for watch, options for bld, etc.)
    bld global strings here for general err messages to user,
    but also keep global hash so can pretty print with color in help menu
*/
var OPTIONS_DESC_HASH = optionInfoString();

// get for flags and ops
var FLAGS_DESC_STR = '';
for ( type of Object.keys(OPTIONS_DESC_HASH['flags']) ) {
    FLAGS_DESC_STR = FLAGS_DESC_STR + "\n\t" + OPTIONS_DESC_HASH['flags'][type]['header'] + "\n";
    // now add all the options that matched this type
    for ( validOp of Object.keys(OPTIONS_DESC_HASH['flags'][type]['matchingoptions']) ) {
        FLAGS_DESC_STR = FLAGS_DESC_STR
            + "\n"
            + OPTIONS_DESC_HASH['flags'][type]['matchingoptions'][validOp]['useage']
            + "\n"
            + OPTIONS_DESC_HASH['flags'][type]['matchingoptions'][validOp]['desc'];
    }
}
var OPS_DESC_STR = '';
for ( type of Object.keys(OPTIONS_DESC_HASH['options']) ) {
    OPS_DESC_STR = OPS_DESC_STR + "\n\t" + OPTIONS_DESC_HASH['options'][type]['header'] + "\n";
    for ( validOp of Object.keys(OPTIONS_DESC_HASH['options'][type]['matchingoptions']) ) {
        OPS_DESC_STR = OPS_DESC_STR
            + "\n"
            + OPTIONS_DESC_HASH['options'][type]['matchingoptions'][validOp]['useage']
            + "\n"
            + OPTIONS_DESC_HASH['options'][type]['matchingoptions'][validOp]['desc'];
    }
}
/**
    take the hash of cmd options and group the options together
    by category of flags/options and for which type of functionality,
    make a header you can print for each of those categories, and
    then find all the options that match in to it and make a useage string and description
    Doing this so can pretty print some strings in help and corrective err msgs
*/
function optionInfoString() {

    var op, desc, foundtypes, optiontype, valids;
    // hash you'll return:
    // will bld up formatted string of options found for each type, then tack the header on at end
    // if don't find any matching options for a category, will delete it
    var infos = {
        'options': {
            'general':{'header':"\n[Value-taking options (general purpose)]:", 'matchingoptions':{}},
            'build':{'header':"\n[Value-taking options for blds only]:", 'matchingoptions':{}},
            'watch':{'header':"\n[Value-taking options for watch only]:", 'matchingoptions':{}}},
        'flags': {
            'general':{'header':"\n[General purpose boolean flags]:", 'matchingoptions':{}},
            'build':{'header':"\n[Flags for builds] only:", 'matchingoptions':{}},
            'watch':{'header':"\n[Flags for watch only]:", 'matchingoptions':{}}}};

    for ( op of Object.keys(VALID_OPTIONS) ) {
        if ( VALID_OPTIONS[op][IS_GRUNT_OP] ) {
            desc = "\t\t(Grunt option; see Grunt documentation for current description)";
        }
        else {
            desc = "\t\t" + VALID_OPTIONS[op][DESC_KEY];
        }
        // add in valid values to description if it's limited to certain values
        if ( VALID_OPTIONS[op][VALUES_KEY] ) {
            desc = desc + "\n\t\tValid values: " + VALID_OPTIONS[op][VALUES_KEY];
        }

        // add in description if its a flag or a value-taking option
        foundtypes = {};
        if ( !VALID_OPTIONS[op][REQUIRES_VALUE_KEY] ) { // allows you to account for ones like --livereload that can be both flag and value taking option
            foundtypes['flags'] = {'useage':"\t--" + op, 'desc': desc};
        }
        if ( !VALID_OPTIONS[op][FLAG_KEY] ) {
            foundtypes['options'] = {'useage':"\t--" + op + "=<value>", 'desc': desc};
        }
        // could be this option takes a value and is a flag.  go through each possibility found
        for ( optiontype of Object.keys(foundtypes) ) {
            if ( VALID_OPTIONS[op][WATCH_KEY] ) {
                // its specified to watch - add this in
                infos[optiontype]['watch']['matchingoptions'][op] = foundtypes[optiontype];
            }
            else if ( VALID_OPTIONS[op][BLD_KEY] ) {
                infos[optiontype]['build']['matchingoptions'][op] = foundtypes[optiontype];
            }
            else {
                infos[optiontype]['general']['matchingoptions'][op] = foundtypes[optiontype];
            }
        }
    }

    // might not have sections for each of these (Ex., flags just for bld),
    // remove those so you don't end up printing out sections with just the header but no content
    // could be confusing
    for ( var stype of Object.keys(infos) ) {
        for ( var subtype of Object.keys(infos[stype]) ) {
            if ( Object.keys(infos[stype][subtype]['matchingoptions']).length == 0 ) {
                delete infos[stype][subtype];
            }
        }
    }
    return infos;
}

// if you run a watch task, must specify at least one some cmd option to specify what to watch. list options here, will validate
var WATCH_TASK_REQUIRES_ONE = [
    WATCH_OP_WATCH_TYPES, WATCH_FLAG_ALL,
    WATCH_OP_SINGLE_FILE, WATCH_OP_MULTIPLE_FILES,
    WATCH_OP_SINGLE_DIR, WATCH_OP_MULTIPLE_DIRS
];
WATCH_TASK_REQUIRES_ONE = WATCH_TASK_REQUIRES_ONE.concat(Object.keys(WATCH_FILE_TYPES)); // all the boolean flags

/** tasks you want user to be able to schedule from cmd line when invoking grunt
    (any task registered in Gruntfile is callable from cmd; no way to privatize tasks)
    value is hash to store validation requirements for the task, if any
    (Descriptions will be printed in help menu and some corrective err msgs during param validation) */
var BLD_TASK_KEY = 'isBldTask';
var VALID_TASKS = {
        [DEV]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tfor front end developers - will generate a working build "
                + "\n\t\tbut no javascript minification and config details remain"
                + "\n\t\tBuild output, unless otherwise specified via cmd params,"
                + "\n\t\twill be <xlr src> (the project source you're using for bld)"
        },
        [INSTALLER]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tfull shippable build."
                + "\n\t\tjs is minified and developer config details removed"
                + "\n\t\tBuild output, unless otherwise specified via cmd params,"
                + "\n\t\twill be in <xlr src>/xcalar-gui/<product>"},
        [TRUNK]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tFor backend developers - will generate a working build,"
                + "\n\t\tbut port in developer's own backend thrift changes, and"
                + "\n\t\tsync back and front end for communication"
                + "\n\t\tBuild output, unless otherwise specified via cmd params,"
                + "\n\t\twill be in <xlr src>/xcalar-gui/<product>"},
        [DEBUG]: {
            [BLD_TASK_KEY]:true,
            [DESC_KEY]:
                  "\n\t\tUsed by Jenkins - this is a regular default build that can"
                + "\n\t\tbe debugged, only developer config details are removed so"
                + "\n\t\tthe build doesn't get connected to developer server"
                   + "\n\t\tBuild output, unless otherwise specified via cmd params,"
                + "\n\t\twill be in <xlr src>/xcalar-gui/<product>"},
        'watch': {
            [BLD_TASK_KEY]:false, [REQUIRES_ONE_KEY]: WATCH_TASK_REQUIRES_ONE,
            [DESC_KEY]:
                  "\n\t\tRuns a cron job, watching for edits in a set of files. "
                + "\n\t\tIf any of these 'watched' files change, will regenerate"
                + "\n\t\tthe appropriate portion of the bld to reflect the change."
                + "\n\t\tA live-reload functionality is available to reload the "
                + "\n\t\tbrowser upon completion, via option --"
                + WATCH_OP_LIVE_RELOAD},
};
/** form strings with the tasks and escriptions for logging purposes during param validation
    make some lists as doing this, so can go through in help and print with colorization.
    also need to check if a task is a bld task or not */
var VALID_BLD_TASKS = {};
var validTask;
for ( validTask of Object.keys(VALID_TASKS) ) {
    if ( VALID_TASKS[validTask][BLD_TASK_KEY] ) {
        VALID_BLD_TASKS[validTask] = VALID_TASKS[validTask][DESC_KEY];
    }
}
var VALID_OTHER_TASKS = {};
for ( validTask of Object.keys(VALID_TASKS) ) {
    if ( !VALID_TASKS[validTask][BLD_TASK_KEY] ) {
        VALID_OTHER_TASKS[validTask] = VALID_TASKS[validTask][DESC_KEY];
    }
}
var BLD_TASKS_DESC_STR = "";
for ( validTask of Object.keys(VALID_BLD_TASKS) ) {
    BLD_TASKS_DESC_STR = BLD_TASKS_DESC_STR + "\n\t" + validTask + " :\n\t\t" + VALID_BLD_TASKS[validTask];
}
var OTHER_TASKS_DESC_STR = "";
for ( validTask of Object.keys(VALID_OTHER_TASKS) ) {
    OTHER_TASKS_DESC_STR = OTHER_TASKS_DESC_STR + "\n\t" + validTask + " :\n\t\t" + VALID_OTHER_TASKS[validTask];
}

// DONE WITH PARAM VALIDATION VARS

/** warning strings to put on top of files autogenerated by Grunt
    (comments that start with '!' will not get removed by grunt htmlmin) */
var AUTOGENWARNINGJS = "/* This file was aautogenerated by Grunt. " +
                    "Please do not modify */\n";
var AUTOGENWARNINGHTML = "<!--!This file was autogenerated by Grunt. Please do not modify-->\n";

// globals set dynamically from user cli options
var PRODUCT;
var PRODUCTNAME; // will be full prod name
var SRCROOT; // root of src code for gui project. populated by cmd option in setup below
var BLDROOT; // top level root of build output.
var DESTDIR; // root where actual build files begin at
var BLDTYPE; // 'debug', 'installer', etc. used for logging
var BACKENDBLDROOT; // root of dev src; set in init
var OVERWRITE;
var FORCE_DELETE_DANGEROUS;
var KEEPSRC;
var WATCH_FILES_REL_TO;

var STEPCOLOR = 'cyan';
var STEPCOLOR2 = 'magenta';

/** TRUNK BLD VAR */
var BACKEND_JS_SRC = 'bin/jsPackage/', // src root (rel BACKEND PROJ ROOT) of thrift scripts to copy in to the gui bld
    GUIPROJ_THRIFT_DEST = 'assets/js/thrift/', // root (rel GUI BLD) where the thrift scripts should be copied
    /* files of the gui bld you want to keep when syncing with thrfit (keys are the files you want to keep, rel bld root)
     (its a hash so can keep track of where the files are temporarily during the copy process) */
    KEEP_FRONTEND_SCRIPTS = {'thrift.js':''}, // keys are files from bld you want to keep when syncing with thrift, rel to the thrift dest
    THRIFT_APACHE_GUI_PATH = 'prod'; // path (rel. to the gui SRC dir), that backend Apache will look for gui BLD at

// for HTML tasks
/**
    html will be built as follows:
        (1) src HTML and related files ported to temp STAGING DIR I; src removed
        (2) Processing tasks which require outside files (templating, include resolves, internationalization, etc.)
            done in STAGIND DIR I, and resulting HTML files only ported to a temp STAGING DIR II.
        (3) Final stand-alone processing (minification, prettification) done in STAGING DIR II.
            processed files in the temp processing dir will be ported to their final destination,

        This approach being done because:
        case that the src dir and dest dir for HTML within a build need to be the same.
        Since want to delete the entire src root of html (since original src HTML files with includes, template syntax, etc.
        should not be included in build), this would end up deleting all your processed html.
        To avoid this, could check if html src and dest dir in the bld are same, and if so, selectively remove dirs/files you don't
        want, post-processing, rather than removing entire src dir (which would actually hold dest files).
        But, since you can specify alt. mappings when doing templating  (which needs to be done
        because some templated HTML files generate to multiple files), you would need to check after
        each templating to see if the original file was overwritten, and if not, overwrite it.
        This becomes convoluted, as this needs to be kept track of over several different tasks and functions,
        This just is another approach and seemed simpler process with less corner cases to keep track of.
*/

// setaging dirs where processing tasks will be done
var htmlStagingDirI = "htmlStaingtmp/", // rel. to DESTDIR
    htmlStagingDirII = "funInTheSun/";
var HTML_STAGING_I_ABS, HTML_STAGING_II_ABS; // abs path gets set after cmd params read in
var htmlWaste = []; // collects stale HTML files during bld process (files with templating code, etc. that don't get overwritten during bld process) which will get removed at cleanup
// autogenrate script tags for following files in to index.html during build process
var ADDSCRIPTTAGS = ['assets/js/mixpanelAzure.js'];

var HTML_BUILD_FILES = []; // a final list of all the bld files, rel. to bld dest (need this for final prettification after minification in installer blds since we're mapping bld html to bld root)

//var DONT_CHMOD = ['assets/stylesheets/css/xu.css'];

/** Following variables determine how js minification will be done
    (where it begins and at what depth to begin concatenating entire dirs)

        JSMINIFICATION_DIV_DIR:
            dir in bld you want to start minifying files from
            (will minify all js starting at, and contained within this dir)
        JSMINIFICATION_CONCAT_DEPTH:
            how many dir levels to start concatenation at?
            (Explaination: for brevity, call this arg 'd', and the divergeAt dir as 'START'.
            For each <dir> nested EXACTLY d levels down from START,
            all js files at or nested within <dir> will get concatenated together and become
            a single minified file - <dir>.min.js.
            Alternatively, each <jsFile> that is nested in a dir which is < d levels from START,
            will get minified by itself, as <jsFile>.min.js.)


            example:

            /assets/jsRt/
                        1.js
                        2.js
                        A/
                            A1.js
                            A2.js
                        B/
                            B1/   (further nesting)
                            B2/   ("" "")
                            Bf.js

            (EX1) divergeAt = '/assets/jsRt/', and concatenateStartDepth = 1
            Would result in following minified files:
                - A.min.js (will contain all js files at or nested within /assets/jsRt/A/)
                - B.min.js ("" "" ""/B/)
                - 1.min.js (contains only 1.js)
                - 2.min.js

            (EX2) divergeAt = '/assets/jsRt/', and concatenateStartDepth = 0,
            Then you'll end up with 1 minified file: jsRt.min.js (contains all js files
            at and nested within /assets/jsRt/)

            (EX3) divergeAt = '/assets/jsRt/', and concatenateStartDepth = 2, files would be named as:
                - 1.min.js
                - 2.min.js
                - A1.min.js
                - A2.min.js
                - B1.min.js
                - B2.min.js
                - Bf.min.js

            @TODO:
            [If there are any naming conflicts (a dir to be minified, of same name as file to be
            minified), will resolve by appending _contents to the dir/.  BUt havvent done yet]

*/

    // file to parse, to get script tags from for js minification (you need to know whicho files to minify, in the order they appear)
var JS_MINIFICATION_PARSE_FILE = "site/partials/script.html",
    MINIFY_FILE_EXT = ".js", // extenion you want ominified files to have
    /** a key for grunt config, to hold a mapping of:
        js filepaths that appear in html script tags --> target filepath to get minified in to.
        gets configured during uglify configuration and consumed in update of script tags
    */
    JS_MINIFICATION_SCRIPT_TAG_FILEPATH_MAPPING_CONFIG_KEY = 'jsFilepathMapping';

// config filepath
var CONFIG_FILE_PATH_REL_BLD = 'assets/js/config.js'; // path rel. to build root

var generatedDuringBuild = {}; // keep track of generated files/dirs you want to display in final summary that would be useful

        /** WATCH FUNCTIONALITY */

var WATCH_CURR_PROCESSING = false, // a global boolean to indicate if a curr watch task processing, so won't trigger other watch processes from that one
        // could happen if the watch tasks that result from editing the watched file, alter a file that is also being watched
    RELOAD_DEFAULT = false,
    WATCH_LIVERELOAD_HASH_CONFIG_KEY = 'livereloadmap'; // a key for grunt.config to hold mapping of watch filetypes and if they should be reloaded
        // configed dynamically based on user params

/** template keys for grunt plugins, and their defaults:
    (since the Grunt has two functionalities - as a bld tool that blds everything,
    and watch specific files, the plugin tasks will get their src (files to perform task on)
    dynamically, using template keys that get set throughout script)
    Parameterizing the key names since they get referenced throughout script
*/
var LESS_TEMPLATE_KEY = 'getless',
    HTML_TEMPLATE_KEY = 'gethtml',
    STAGE_HTML_TEMPLATE_KEY = 'stagehtml',
    JS_TEMPLATE_KEY = 'getjs',
    CSS_TEMPLATE_KEY = 'getcss',
    CHMOD_TEMPLATE_KEY = 'chmodt';
// default values.  default being, what you'd want if you're executing a full bld
var TEMPLATE_KEYS = {
    [LESS_TEMPLATE_KEY]: '*.less',
    [HTML_TEMPLATE_KEY]: '**/*.html',
    [STAGE_HTML_TEMPLATE_KEY]: '**/*.html',
    [JS_TEMPLATE_KEY]: '**/*.js',
    [CSS_TEMPLATE_KEY]: '**/*.css',
    [CHMOD_TEMPLATE_KEY]: '**/*',
};

var END_OF_BUILD_WARNINGS = []; // some warnings that might be bugs we collect over build life to display in summary

                            /** BLACKLISTS */

    // dont do HTML prettification on these (obj so key lookup for filter rather than iter. list for every single html file to check)
var DONT_PRETTIFY = ["datastoreTut1.html", "datastoreTut1DemoMode.html", "datastoreTut2.html", "workbookTut.html"],
    // a list of files and/or directories, not to template (for dirs, won't template any files within those dirs)
    DONT_TEMPLATE_HTML = htmlMapping.required, // MAKE THESE REL PATHS to src/bld
    /**
        list of files and/or dirs, not to minify
        Make dirs REL BLD. wont minify any file within that dir
        For files, just put the filename.  Won't minify any file with that name.
        (want to be able to debug these in the field regularly
         and if you minify them putting breakpointst becomes really difficult)
    */
    DONT_MINIFY = ['3rd', 'assets/js/unused', 'assets/js/worker', 'config.js'],
    // at end of bld will chmod everything to 777.  dont chmod what's in here (it fails on symlinks which is why im adding this)
    DONT_CHMOD = ['xu.css'],
    // dont remove debug comments from these files when runnign with --rc
    JS_FILES_NOT_TO_REMOVE_DEBUG_COMMENTS_FROM = [],
    /** project src files and dirs to explicitally exclude from bld.
        Anything specified here will be EXCLUDED during initial rsync of src code in to build root
        Paths should be relative to SRC ROOT.

        Be aware - if your ROOT and DEST are same (you're blding in to root), then initially those bld dirs will get made
        and then you will do rsync.  And so need to add in at that time, to exclude that dir from the rsync otherwise you'll
        fall in to a recursive loop (since it is rsyncing the dir as it's filling up...) however, might not know dest dir name
        until after user params, so can not add it in here yet...
    */
    DONT_RSYNC = [
        'assets/dev',
        '*.git*',
        "'/internal'",
        "'/Gruntfile.js'", // if you don't add as '/<stuff>', will exclude any file called <stuff> anywhere rel to rsync cmd
                // only want to remove our Gruntfile at the root!
        'gruntMake.js',
        "'/Makefile'",
        "'/node_modules'",
        "'/package-lock.json'",
        "'/package.json'",
        "'/prod'",
        'services/expServer/awsWriteConfig.json',
        'assets/xu/themes/simple/css/xu.css',
        'assets/help/XD/Content/B_CommonTasks/A_ManageDatasetRef.htm',
        'assets/help/XI/Content/B_CommonTasks/A_ManageDatasetRef.htm',
        'assets/js/constructor/README',
        'site/genHTML.js',
        "'/xcalar-design'", // common bld names, in case you've blt in to src under these names in past.. dont copy that in..
        "'/xcalar-insight'", // """ ""
        'frommake',
        "'/xcalar-gui'", // "" ""
    ];
/**
    exclude the files specified for removal in the individual file type builders
*/
DONT_RSYNC = DONT_RSYNC.concat(constructorMapping.remove.map(x => constructorMapping.src + x));
// code line above prepends .src attr to each el in .remove list, to obtain path rel to SRCROOT (.src rel to SRCROOT, .remove els rel to .src)
DONT_RSYNC = DONT_RSYNC.concat(cssMapping.remove.map(x => cssMapping.src + x));
DONT_RSYNC = DONT_RSYNC.concat(htmlMapping.remove.map(x => htmlMapping.src + x));
DONT_RSYNC = DONT_RSYNC.concat(jsMapping.remove.map(x => jsMapping.src + x));


module.exports = function(grunt) {

    // if they requested help for this file, display that instead of Grunt's help
    if ( grunt.option('help') ) {
        displayHelpMenu();
        grunt.fail.fatal("");
    }

    pkg = grunt.file.readJSON('package.json');

    /**
        set up all config data, cmd option processing, etc.
        ORDERING IS IMPORTANT

        In this order:

        (1) process cmd options

        (2) set grunt.initConfig (depends on (1))

        (3) set dynamic attributes in to grunt.config (depends on (2)

        (4) register plugin tasks with grunt (depends on (2))

        (3 or 4 doesn't matter which comes first)
    */

    /**

        init Part (1) : PROCESS CMD OPTIONS

            (Call BEFORE grunt.initConfig)

            Validate cmd params, get their values,
            and resolve global params and config attributes
            which rely on them.
            - i.e., SRCROOT, DESTDIR -

            Done before because task/target config data in grunt.init
            relies on this data and these params.
            (the alternative would be to update every single target
            once you have the data, to set it in)
    */
    processCmdOptions();

    /**

        init Part (2) : setup grunt initConfig

            Some of the work in this build script (such as minification, HTML prettifying, etc.) will be accomplished using Grunt plugins.
            Grunt plugins and custom multitasks require individual configuration, wtihin grunt.initConfig

            If you are new to grunt, read the following link, to understand the syntax being used here in case you need to modify it.

            https://gruntjs.com/configuring-tasks#compact-format

            Summary points about these plugin tasks:: (since not all in Grunt documentation)

            * Each plugin can have multiple targets defined; call them via grunt.task.plugin(<task>:<target>);
            * Each plugin has its own options unique to that plugin, which can be set via keys in an 'options' hash.
            * cwd, src, dest, expand, flatten, filter, etc. are options avaialble via grunt to all plugins.
                Main are src and dest, to determine what files to use on the task; others are optional

                - src: Files/dir, etc., to execute the task on.  By default, src is relative to Grunt's base, which is process.cwd()
                - cwd: changes what 'src' is relative to.
                - dest: destination dir for filepath of the completed task, i.e., the result of the object/file/dir/etc with the task applied to it.
                    If not specified will use Grunt's running location (unless you have change Grunt settings manually)
                    if dest itself is a relative path, will be relative to what src is relative to.  if it's abs., uses abs. path..
                [[ex: do some task on all html files stored in dirA (Recursive to subdirs), and store the results in destB, retaining dir structure
                cwd: <dirA>, src: **\/*.html, dest: <dirB>]]

            * src list will be stored when initConfig is RUN, not when target is run.
                meaning, suppose you have a target set up
                mytarget: {cwd: /path/, src: SOMELISTOFFILES, dest: /dest/}
                Suppose that initially SOMELISTOFFILES is an empty list, and it gets filled up dynamically, before the target is invoked.
                Those dynamic values will not gert used. Rather it's going to store the values that are present at time initConfig is run
                If you want to do something dynamic like that, where you won't know the values until shortly before you call the target,
                you will need to use template string instead to communicate the values.

            * Syntax: There are 3 main syntax options on how to use these, based on your scenario:

                // 1. ONLY ONE src/dest pairing for the target.  You can also use additional options l;ike filter, etc. (Here path1, path2 will both map in to dest)
                    <target>: { src : [<path1>,<path2>], dest : <dest> }

                // 2. MULTIPLE src/dest mappings, and do NOT need any of the extra options beyond src and dest such as filter, flatten, etc; src, dest understood by context
                    <target>: { files: { <destA> : [<pathA1>,<pathA2>], <destB> : [<pathB1>,<pathB2>] } }

                // 3. MULTIPLE src/dest mappings, and DO need additional options such as filter, flatten, etc.
                    <target>: { files: [{src: [<pathA1>,<pathA2>], dest:<destA>, expand:true},{src: [<pathB1>,<pathB2>], dest:<destB>, flatten:true}] }

                ** SOME PLUGINS USE THEIR OWN CUSTOM SYNTAX - rsync is an example.

            * GLOBBING PATTERNS: **\/*.html matches all html files from cwd and recursively
            * once you set configuration datao for a plugin, make sure to install the plugin, and add grunt.task.loadplugin(<full plugin name>);

            NOTES: if you get 'unable to read' on doing recursive file operations such as 'copy', make sure you have expand:true in the options

    */
    grunt.initConfig({

        /**
            Templatea key note:
            The attrs of many tasks below rely on template keys (i.e., <%= SRC_ROOT %>)
            This allows you to dynamically change the src for tasks,
            which will be needed for watch functionality (ex: do html processing tasks
            on a specific file, vs. the entire html src directory)
            Template keys must be set as attrs of this grunt.config to be picked up by tasks.
            So, once initConfig completes, set in default values.
            Watch functionality will set them dynamically as needed
        */

        // changes file permissions ala chmod.
        // using because fs.chmod does not offer -R (recursive) option,
        // and need to change permissions of entire dest dir once it is built
        chmod: {
            // change permissions of everything in the build (call this once build is complete)
            finalBuild: {
                options: {
                    mode: '777'
                },
                cwd: DESTDIR,
                src: '**/*',
                expand: true,
                filter: function(filepath) {
                    if ( DONT_CHMOD.indexOf(path.basename(filepath)) !== -1 ) {
                        grunt.log.writeln("Do NOT CHMOD the file @: " + filepath + "... (Blacklisted)");
                        return false;
                    }
                    else {
                        return true;
                    }
                },
            },
        },

        /**
            remove files/folders
            Using because grunt.file.delete doesn't allow globbing patterns
        */
        clean: {
            // remove html Staging area once you are done using it.  poor html staging area :'(
            options: {
                force: FORCE_DELETE_DANGEROUS,
            },
            htmlStagingI: [HTML_STAGING_I_ABS], // for clean, you need to put the 'src' in [] else it will only delete what is within the dir
            htmlStagingII: [HTML_STAGING_II_ABS], // for clean, you need to put the 'src' in [] else it will only delete what is within the dir

            // generatel target for removing dirs/files; set src dynamically, supply abs. paths
            custom: {
                // set src here
                src: [],
            }
        },

        /**
            does a depth first search to clean out empty dirs.
            (using it to clean up the build after everything is done)

             ex:
            If you have
                A/ --
                    B/ --
                        C/
            And all these are empty, it will remove C first, then B becomes empty, will remove B,
            A becomes empty now, and removes A

        */
        cleanempty: {
            options: {
                files: false,
                folders: true,
                noJunk: true, // considers dirs with only things like 'thumbs.db' to be empty and so will remove those too
                force: FORCE_DELETE_DANGEROUS,
            },
            finalBuild: {
                options: {
                    files:false, // do NOT clean empty files.  Make sure to have this; default is true, and make empty config file on some builds and you want to keep it!
                },
                src: DESTDIR + "**/*",
                expand: true,
            },
        },

        /** copy operations (using because grunt.file.copy api does not copy entire dir) */
        copy: {

            // shift HTML src to initial Staging dir
            stageHTML: {
                options: {},
                cwd: DESTDIR + htmlMapping.src,
                src: '<%= ' + STAGE_HTML_TEMPLATE_KEY + ' %>', //'**/*', // copies everything starting from not including the top level html src, in to the staging dir, maintaining dir strucoture
                expand: true,
                dest: HTML_STAGING_I_ABS,
                filter: function (filepath) {
                    // Construct the destination file path.
                    ccwd = grunt.config('copy.stageHTML.cwd');
                    cdest = grunt.config('copy.stageHTML.dest');
                    relportion = path.relative(ccwd, filepath);
                    var filedest = path.join(
                        grunt.config('copy.stageHTML.dest'),
                        relportion
                    );
                    grunt.log.debug("filepath: " + filepath + " cwd: " + ccwd + ", dest: " + cdest + " rel: " + relportion + " dest: " + filedest);
                    return true;
                },
            },
            // shift final processed HTML from the second staging dir, to it's final destination
            destHTML: {
                options: {},
                cwd: HTML_STAGING_II_ABS,
                src: '**/*', // copies everything starting from not including the top level html src, in to the staging dir, maintaining dir strucoture
                expand: true,
                dest: DESTDIR + htmlMapping.dest,
            },
            /**
                There is a help content dir for generating the help anchors, for each individual product,
                under assets/help/
                Only want the dir relevant to product being built, in our final build, and want it in assets/help/user

                Therefore, will want to:

                1. cp assets/help/<PRODUCT> --> assets/help/user <-- what this target does
                2. delete all other dirs in assets/help/ beside assets/help/user <-- clean up portion of generating help contaent will take care ofe this

                In the case of a dev bld, of course you don't want to do step 2 because it would be the project src itself
            */
            transferDesiredHelpContent: {
                options: {},
                cwd: DESTDIR + helpContentRoot + PRODUCT, // worked with and without trailing '/'
                src: "**/*", // get ALL files at and nested within cwd.  THey will all be paths relative to cwd (retaining dir structure)
                expand: true, // need this option to make sure you go nested; it fails when I take it out.  allows you to expand items in 'src' arg dynamically
                dest: DESTDIR + helpContentMapping.src, // confusing naming, it's src because this is the src of where the relative files should be
                    // required generating the actual helep content. hence, why we are creating it now; this target is setting up for that process.
            },
            /**
                front-end developers develop the constructor files within their git repo, in constructorMapping.src
                In the final build, these files need to be in constructorMapping.dest.
            */
            constructorFiles: {
                options: {},
                cwd: DESTDIR + constructorMapping.src,
                src: "*", // get ALL files at and nested within cwd.  THey will all be paths relative to cwd (retaining dir structure)
                expand: true, // allows 'src' arg to be dynamically populated (so will fail without, if you're supplying a glob to 'src')
                dest: DESTDIR + constructorMapping.dest,
            },

            /**
                This target being used by watch tasks,
                so you can port in dirs/files required for re-generating a particular filetype if it changes
                (ex. for html file, you need to do includes, templatign etc., so if watching an html
                src file, not always sufficient to just copy in that changed file, you might need these
                others.).
                The 'src' attribute will get set dynamically, to specify the dependencies for that file
                Using this instead of rsync because can't control cwd on rsync plugin,
                filter here is so you don't copy over existing files
            */
            resolveDependencies: {
                options: {},
                cwd: SRCROOT,
                src: [], // if you discover you need dep., should set this via grunt.config then run the task
                expand: true,
                dest: DESTDIR,
                // Copy only if file does not exist.
                filter: function (filepath) {
                    // Construct the destination file path.
                    ccwd = grunt.config('copy.resolveDependencies.cwd');
                    cdest = grunt.config('copy.resolveDependencies.dest');
                    relportion = path.relative(ccwd, filepath);
                    var filedest = path.join(
                        grunt.config('copy.resolveDependencies.dest'),
                        relportion
                    );
                    grunt.log.debug("cwd: " + ccwd + ", dest: " + cdest + " rel: " + relportion);
                    if ( grunt.file.exists(filedest) && !grunt.file.isDir(filedest) ) {
                        grunt.log.debug("\tfile " + filedest + " exists and is not a dir; skip");
                    }
                    // Return false if the file exists.
                    return !(grunt.file.exists(filedest));
                },
            },
        },

        // minifies HTML
        htmlmin: {
            stagingII: { // html processing is done within staging area
                options: {
                    removeComments: true,
                    collapseWhitespace: true,
                    preserveLineBreaks: true
                },
                //cwd: DESTDIR + htmlMapping.dest,
                cwd: HTML_STAGING_II_ABS,
                src: ['<%= ' + HTML_TEMPLATE_KEY + ' %>'],//['**/*.html'],
                expand: true,
                //dest: DESTDIR + htmlMapping.dest,
                dest: HTML_STAGING_II_ABS,
                //ext: '.testing',
            },
        },

        /**
            Resolves 'include' statements in HTML files.
        */
        includes: {
            staging: { // html processing done within staging area. omit dest to keep processsed file at same place
                options: {
                    silent: false,
//                    includePath: DESTDIR + htmlMapping.src,
                },
                cwd: HTML_STAGING_I_ABS,
                src: '<%= ' + HTML_TEMPLATE_KEY + ' %>',// HTML_STAGING_I_ABS + '**/*.html', // get all html files in 'cwd', recursive
                expand: true,
                dest: HTML_STAGING_I_ABS,
            }
        },

        // compiles build CSS from src less files
        less: {
            dist: {
                options: {
                    //paths: ['assets/css']
                },
                cwd: DESTDIR + cssMapping.src,
                src: '<%= ' + LESS_TEMPLATE_KEY + ' %>', //grunt.option(WATCHFLAG) || '*.less', // get all less files in 'cwd' (only get the top level ones)
                expand: true,
                dest: DESTDIR + cssMapping.dest,
                ext: ".css",
                filter: function(filepath) {
                    fileme = path.basename(filepath);
                    if ( cssMapping.exclude.hasOwnProperty(fileme) ) { // check if one of the efiles to exclude
                        return false;
                    } else {
                        return true;
                    }
                },
            },
        },

        // cleanup bld HTML such as indenting inner HTML
        prettify: {
            //dist: {
            stagingII: {
                options: {
                    "wrap_line_length": 80,
                    "preserve_newlines": true,
                    "max_preserve_newlines": 2
                },
                //cwd: DESTDIR + htmlMapping.dest,
                cwd: HTML_STAGING_II_ABS,
                src: '<%= ' + HTML_TEMPLATE_KEY + ' %>',//**/*.html',
                expand: true,
                //dest: DESTDIR + htmlMapping.dest,
                dest: HTML_STAGING_II_ABS,
                /**
                    filter out files we don't want to prettify
                    (each filepath matched by src glob will be passed to this function)
                */
                filter: function(filepath) {
                    return prettifyFilter(filepath);
                },
            },
            /** prettify:cheerio target -
                collect fully processed bld HTML files and removes blank lines.
                needed because, if you use cheerio to update js script tags in the HTML during minification,
                it leaves you with empty lines where you removed DOM elements.
                doing this from the html bld dest, because this task will be done after js minification,
                once the files are already processed and in their final destination.

                PROBLEM to be aware of - we're mapping the final build html to the build root.
                So you're going through and prettifying EVERYTHING starting from that dir
            */
            cheerio: {
                options: {
                    "wrap_line_length": 80,
                    "preserve_newlines": true,
                    "max_preserve_newlines": 2
                },
                cwd: DESTDIR + htmlMapping.dest,
                src: "**/*.html",
                expand: true,
                dest: DESTDIR + htmlMapping.dest, // replace files
                /**
                    ABOUT THIS FILTER:
                    - Only want to prettify bld files (not 3rd party,e tc.)
                    - However, bld dest for html is the bld root itself,
                        so collecting all html files rooted at html's dest in bld,
                        will get all html files in the bld, not just actual bld ones
                    - We Have list of what are the final bld files,
                      but it gets built up dynically as build is running (though before this task runs)
                      and is empty when script begins and initConfig run.
                    - the prettify target, if you give a list as its 'src' attr, will consider the list's
                      value at time initConfig runs, NOT at time target itself runs (fml)
                      Which means, we can not use that list as the 'src' attribute directly
                    - Therefore, provide filter, and for each filepath, see if its one of the bld files.
                */
                filter: function(filepath) {
                    var ccwd = grunt.config('prettify.cheerio.cwd');
                    // remember there's alo prettification blacklist
                    if ( prettifyFilter(filepath) &&
                        HTML_BUILD_FILES.indexOf(path.relative(ccwd, filepath)) !== -1 ) {
                        return true;
                    }
                    else {
                        grunt.log.debug("Skip cheerio prettification of "
                            + filepath
                            + "\n; not one of the bld html files collected."
                            + "\nFILES COLLECTED DURING BLD:\n"
                            + HTML_BUILD_FILES);
                    }
                },
            }
        },

        /*
            runs rsync cmd for file transfer.
            (rsync uses a different syntax!! everything goes in 'options'; cwd doesn't seem to work)
        */
        rsync: {
            /**
                rsync:initial ports in contents of src dir to build root for initial build up.
                using this rather than cp/grunt-contrib-copy because rsync has useful options for excluding dirs,
                else would either need to supply a filter to copy method (which will test at each dir), or copy in
                everything and remove excluded dirs as an additional step.
                Also, if you ever want to be able to run this over another host, should be easy, check out
                documentation of grunt-rsync; maybe add in a cmd option for this
            */
            initial: {
                options: {
                    args: ['-a', '--update'/** --verbose */], // put rsync options you want here (-a will preserve symlinks, ownership, etc; see rsync man page
                    exclude: DONT_RSYNC,
                    src: SRCROOT + '.', // will copy starting from SRCROOT
                    dest: DESTDIR,
                    recursive: true,
                },
            },
        },

        /** auto generates script tags in to HTML docs

            - switched to 'scriptlinker' from 'tags' because it provides option to make tags rel to a root;
            if you use 'tags', tag will be rel. to location of file when task invoked.
            This task being invoked while file in staging area, so that will ultimately be incorrect.
            Done in staging area because autogen script tasks work by looking for autogen start comments, which get removed by htmlmin

            - This task will fail if you are watching an html file and rebld only that file
        */
        scriptlinker: {
            // will add mixpanelAzure tags in to index.html
            stagingII: {

                options: {
                    startTag: '<!-- start auto template tags -->',
                    endTag: '<!-- end auto template tags -->',
                    fileTmpl: '<script src="%s" type="text/javascript"></script>',
                    appRoot: htmlMapping.dest,
                },
                cwd: DESTDIR,
                src: ['assets/js/mixpanelAzure.js'],
                dest: HTML_STAGING_II_ABS + 'index.html'
            }
        },

        /**
            grunt-contrib-uglify to minify (collapse and mangle) javascript files for the build output
        */
        uglify: {
            /**
                configuration for this plugin will be dynamically generated based on current src dirs
                see function 'configureUglify'
            */
        },

        /**
            watch runs a chron job.
            If any changes occur to any files within the 'files' attr list,
            will execute the list of tasks in the 'tasks' attr.

            Keep blank except for global options -
            . will set the 'files' attr when reading in cmd params (because there are options for
            which files/filetypes to watch)
            . and will set the 'tasks' attr in the watch on event -
            because tasks to execute will depend on which file was changed
            (i.e., if a less file chnaged, a different workflow than if an html src file changed)
        */
        watch: {
            options: {
                nospawn: true,
                spawn: false,
                //livereload: true,
            },
            files: [], // generated dynamically based on user specified watch cmd args
            tasks: [], // set in watch on event based on which file changed
        },

    });

    /**
        init Part (3)

            (call after grunt.initConfig)

        Set grunt config data (such as src template keys used by task targets),
        which rely on cmd option values.

        On ordering:
        Can not do this as part of 'processCmdOptions()',
        as that method must be called BEFORE grunt.init,
        and this must be called AFTER grunt.init, as that is what
        creates the 'grunt.config' object the function will set data in to.
        Should be called prior to any tasks executing.

    */
    setDynamicGruntConfigAttrs();

    /**
        init part (4).

        load the plugin tasks configured above
        (Grunt Requirement for any plugins you want to use)
    */
    grunt.loadNpmTasks('grunt-chmod');
    grunt.loadNpmTasks('grunt-cleanempty');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-includes');
    grunt.loadNpmTasks('grunt-prettify');
    grunt.loadNpmTasks('grunt-rsync');
    grunt.loadNpmTasks('grunt-scriptlinker');

                                            /** END MAIN INITIALIZATION **/

    /**

        MAIN BUILD TASKS

        These are the tasks intended to be run from cmd line.
        :: > grunt <build flavor>

    */

    /**
        DEV BUILD : Use by front-end developers

        run grunt on the cmd line without any arguments, to trigger this build flavor, or by name:

            ::> grunt dev
    */
    grunt.task.registerTask(DEV, "Default build for frontend developers", function() {

        grunt.task.run(BUILD);

        grunt.task.run(FINALIZE);

    });

    /**
        DEBUG
        Jenkins will use the debug build.  It is just like the default build,
        with no minification, etc.,
        only with developer configuration details removed at the end.  You must
        do this or its going to connect to developer server, etc.  and that's
        why this separate build flavor is offered.

        ::> grunt debug
    */
    grunt.task.registerTask(DEBUG, function() {

        grunt.task.run(BUILD);

        grunt.task.run(NEW_CONFIG_FILE); // clear developer configuration details

        grunt.task.run(FINALIZE);

    });

    /**
        INSTALLER BUILD : What Jenkins will run - intended as an actual shippable build

        ::> grunt installer
    */
    grunt.task.registerTask(INSTALLER, function() {

        grunt.task.run(BUILD);

        grunt.task.run(NEW_CONFIG_FILE); // clear developer configuration details

        /**
            js minification must come AFTER the above build task!!
            this is because js files must be concatenated for minification in a particular order.
            This order will be obtained by parsing index.html.
            however, index.html must be built and processed first to do this
            (initial src does not have includes resolved, and resides in diff dir)
            Also - the config file will be minified, and so make sure you have set the
            new config file before minification!
        */
        grunt.task.run(MINIFY_JS);

        grunt.task.run(FINALIZE);

    });

    /**
        TRUNK : Use by backend developers when they have made changes in
        thrift, and want to test those changes out with the frontend.
        This is just like the default build, only with with front and backend
        synced at the end to ensure communication.

        ::> grunt trunk
    */
    grunt.task.registerTask(TRUNK, 'trunk', function() {

        grunt.task.run(BUILD);

        grunt.task.run(SYNC_WITH_THRIFT);

        // if you ever decide to do js minification for trunk blds
        // make sure it comes after syncWithThrift,
        // -> because config.js gets minified atow,
        // and a custom config.js is needed for trunk blds and that
        // gets generated during synWithThrift

        grunt.task.run(FINALIZE);

    });

                /**
                        HELPER TASKS.
                        SHOULD NOT BE CALLED FROM CMD
                        UNFORTUNATELY NO WAY TO PRIVATIZE TASKS.

                */

    /**
        blow away existing bld dirs if they exist
    */
    grunt.task.registerTask(PREP_BUILD_DIRS, function() {

        var olColor = 'rainbow';
        grunt.log.writeln('\n\t::::::::::::: SETUP ::::::::::::::::\n');
        grunt.log.writeln(process.cwd());
        if (grunt.file.exists(DESTDIR)) {
            grunt.log.writeln("Destination dir for bld " + DESTDIR + " already exists!");
            if ( OVERWRITE ) {
                // if build dir alreadfy exists, delete contents
                // MAKE SURE IT'S NOT CWD OR SRCROOT!!!
                if ( DESTDIR == SRCROOT ) {
                    grunt.fail.fatal("Grunt is set to overwrite bld dir if it exists,"
                        + " but the build dir you've specified is same as your project source!! \n"
                        + SRCROOT
                        + "\nI'm not going to delete this!"
                        + "\n\n(Note: I caught this special case, but there is a boolean option --"
                        + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS
                        + " to protect against this behavior, for ALL cases where bld dir might exist)");
                }
                if ( DESTDIR == process.cwd() ) {
                    grunt.fail.fatal("Destination dir for build output is specified as the cwd,"
                        + "\nGrunt is set to overwrite the build output dir if it exists.\n"
                        + " I'm not going to delete this, even with the force option!!"
                        + "\n\n(Note: I caught this special case, but there is a boolean option --"
                        + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS
                        + " to protect against this behavior, for ALL cases where bld dir might exist)");

                }
                grunt.log.writeln("overwrite specified... deleting...");
                grunt.file.delete(DESTDIR, {force:FORCE_DELETE_DANGEROUS}); // до свидания!
            }
            else {
                // valid use case: in DEV blds, def behavior is srcroot same as destdir.
                // so in this case you don't mind this happening.
                if ( SRCROOT != DESTDIR ) {
                    grunt.fail.fatal("Root for build: "
                        + DESTDIR
                        + " already exists!  But option --"
                        + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS
                        + " set. \nEither omit this option, set to false,"
                        + " or select another bld dir with --"
                        + BLD_OP_BLDROOT +"=<another dir>"
                        + " (It will be created for you if it does not exist)");
                }
            }
        }
        grunt.log.write("Create build dir " + DESTDIR + " ... ");
        grunt.file.mkdir(DESTDIR); // grunt.file.mkdir will make any intermediary dirs
        grunt.log.ok();

        /**

        if BLDROOT (and thus DESTDIR) are dec. from SRCROOT,
        need to exclude the top level destination dir (BLDROOT - the dir at SRCROOT level where bld starts)
        from the initial rsync
        Else, will be filling that dir up, as copying it in, and will copy forever..
        (The dir you add in needs to be relative to wheatever the rsync cmd is rel. to.  currently, SRCDIR...)

        i.e.
                SRCROOT: /home/jolsen/xcalar-gui
                DESTDIR: /home/jolsen/xcalar-gui/out/bld/CodeStartsHere/
                retrieve: 'out', and exclude this from the initial rsync.

        */
        //if ( grunt.file.doesPathContain( SRCROOT, BLDROOT ) ) {
        if ( grunt.file.doesPathContain( SRCROOT, DESTDIR ) ) {
            grunt.log.writeln(DESTDIR + " contained within " + SRCROOT );
            //DONT_RSYNC.push(path.basename(BLDROOT));
            DONT_RSYNC.push(path.relative(SRCROOT, DESTDIR));
        }

        grunt.log.writeln('\n------------------------------------------------------');
        grunt.log.writeln('\nBuilding ' + pkg.name + ' - v' + pkg.version + ' -1 ' + PRODUCT + " variant...\n");
        grunt.log.writeln('\nGenerating Build from repo loc at : ' + SRCROOT);
        grunt.log.writeln('Build Root @ : ' + BLDROOT);
        grunt.log.writeln('Build files begin at @ : ' + DESTDIR);
        grunt.log.writeln('\n-------------------------------------------------------\n');

        grunt.log.writeln('\n\t::::::::::::: END SETUP ::::::::::::::::\n');
    });

    /**
        Runs main build tasks required for all build flavors:

        Rsyncs in src code,
        Generates bld HTML and CSS from it,
        configures dirs for help content, constructor files for durable structs,
        and updates essential JS files to ensure  proper product name displayed in GUI

        (These tasks are independent and aside from rsync which must come first,
        their order does not matter)
    */
    grunt.task.registerTask(BUILD, function() {

            // now construct the ultimate build directory
            grunt.task.run(PREP_BUILD_DIRS); // generate dirs needed for build process

            /**
                For DEV BLDS:
                The default behavior is to put the bld output directly at same root as project src.
                (Though user can specify params to change this behavior)
                So for a dev bld following the default behavior, do NOT do the initial rsync!
                (Similarly on other blds user could use params to make it this way,
                so only do the rsync if the bld and src root are different
            */
            if ( SRCROOT != DESTDIR ) {
                grunt.task.run('rsync:initial');
            }
            grunt.task.run(HELP_CONTENTS);
            grunt.task.run(BUILD_CSS);
            grunt.task.run(BUILD_HTML);
            grunt.task.run(CONSTRUCTOR_FILES);
            /**
                In XI builds, update essential js files where UI msgs reside,
                to display Xcalar Insight rather than xcalar design
                (the files developed with XD strings by default)
            */
            if ( PRODUCT == XI ) {
                grunt.task.run(UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME);
            }
    });

                            // ============================= HELP CONTENTS =================================


    /**
        Generate js file that contains structs to use for help anchors.
        This will be done parsing through htm documentation and parsing
        Generate help tags file

        Will store 2 variables:

        var csLookup: <n entries per file; one for each 'ForCSH' <a href> class tag

        var helpHashTags: <1 entry per file>
    */
    grunt.task.registerTask(HELP_CONTENTS, function() {

        // you have XD and XI help contaente in the src code that was copied in
        // copy what you need in to /usr and delete the rest
        // corner casE: srcroot and destdir are the same.  In that case still do the usr dir,
        // but don't delete...
        grunt.task.run('copy:transferDesiredHelpContent');

        // generate structs file using the relevant help content
        grunt.task.run(GENERATE_HELP_STRUCTS_FILE);

        // file for searching help content in XD
        grunt.task.run(GENERATE_HELP_SEARCH_INSIGHT_FILE);

        // delete out those folders not related (this could be done before or after the main generateHelpStructsFile task,
        // but putting it after in case there ever are some pending tasks for cleanup)
        if ( SRCROOT != DESTDIR ) {
            grunt.task.run(CLEANUP_HELP_CONTENT_DIR);
        }
    });

    /**
        Generates the htm file for searching help in XD
        Insert custom styling so it conforms to the XD style
    */
    grunt.task.registerTask(GENERATE_HELP_SEARCH_INSIGHT_FILE, function() {

        /**
            get all the html files (except those in 3rd)
             for each html file.. and squash them to go js/<get rid stuff>/filename

            - Generate a file SearchInsight..html

            In that file:.

            - Open the file assets/help/user/Content/Search.htm
            - read through it, writing each of its line, until you hit <style> tag...
                when you hit the <style> tag,
                you add in the content from site/partials/mcf.html
                TYhen you keep going and write the rest of the Search.htm fila
        */
        readFile = DESTDIR + 'assets/help/user/Content/Search.htm';
        insertFile = DESTDIR + 'site/partials/mcf.html';
        // anew file loc
        basefilename = path.basename(readFile, path.extname(readFile));
        origFileLoc = path.dirname(readFile); // dir to put in
        if ( !origFileLoc.endsWith(path.sep) ) { origFileLoc = origFileLoc + path.sep; }

        newfilename = path.basename(readFile, path.extname(readFile)) + 'Insight.htm';
        newfileloc = origFileLoc + newfilename;

        // read contents of the files
        filecont = grunt.file.read(readFile);
        insertFileCont = grunt.file.read(insertFile);

        grunt.log.writeln("here");
        /**
            Insert the custom style contents, right before the initial <style> tag
            'split', on <style> - will not save delimeter... so split,
            write out the first pice (content before first <Style>, write the custom stuff,
            , add back in your delimeter <style>, and then the rest of the data
        */
        var styleDelim = '<style>';
        stylesplit = filecont.split(styleDelim);
        var newContent = "";
        if ( stylesplit.length < 2 ) {
            grunt.fail.fatal("Trying to inserted custom style section in to"
                + readFile
                + "\nSearchin for style tag: '"
                + styleDelim
                + "', but I can not find this tag in the file!");
        }
        else {

            // section prior to initial <style> tag
            newContent = newContent + stylesplit[0];

            // insert custom styling
            newContent = newContent + "\n\n<!-- Begin section inserted by Grunt -->\n";
            newContent = newContent + insertFileCont;
            newContent = newContent + "\n<!-- End section inserted by Grunt -->\n\n";

            // insert back in the style delim
            newContent = newContent + styleDelim;

            // now add in all remaining pieces in the split ( in case there were more than one style tags)
            for ( i = 1; i < stylesplit.length; i++ ) {
                newContent = newContent + stylesplit[i];
            }

            // write the new file
            writeAutoGeneratedFile(newfileloc, newContent, " File for generating search insight");
        }
    });

    /**
        generate a js file that defines some structs to be used by js files.

        var <structVar> = <JSON data>
    */
    grunt.task.registerTask(GENERATE_HELP_STRUCTS_FILE, function() {

        var helpStructsFilepath = DESTDIR + helpContentMapping.dest,
            content = "";

        // get the data for generating these
        // will be in form: keys (name of a struct var you want to define)
        // value being, the data structure to jsonify
        structVarsData = generateHelpData();

        // generate a String as you want the file to be, holding this data
        var structVar;
        for ( structVar of Object.keys(structVarsData) ) {

            // write data for this file to the help hash tags struct
            content = content + "var " + structVar + " = ";
            content = content + JSON.stringify(structVarsData[structVar], null, '    ');
            content = content + ";\n";

        }

        // create the new file that holds the struct data
        writeAutoGeneratedFile(helpStructsFilepath, content, "help structs file");

    });

    /**
        removes unneeded help content from bld.

        (The src code has dirs help/XD and help/XI, but only one used,
        and it gets renamed as help/user.
        This cleanup task is deleting those unused ones.)
    */
    grunt.task.registerTask(CLEANUP_HELP_CONTENT_DIR, function() {

        // go through the help content dir and delete everything that's not the user dir
        helpContentRootFull = DESTDIR + helpContentRoot;
        helpDirs = grunt.file.expand(helpContentRootFull + "*");//, {filter:'isDirectory'});
        var helpDir, helpDirAbsSrc;
        for ( helpDir of helpDirs ) {
            if(!helpDir.endsWith(path.sep)) { helpDir = helpDir + path.sep; }
            helpDirAbsSrc = DESTDIR + helpContentMapping.src;
            if ( helpDirAbsSrc !== helpDir ) { // we're only getting the dirs at that top level; not recursive
            //if ( helpDirAbsSrc !== helpDir && !grunt.file.doesPathContain(helpDirAbsSrc, helpDir) ) {
                grunt.log.write("Delete unneeded help content dir : " + helpDir + " ... ");
                grunt.file.delete(helpDir, {force:FORCE_DELETE_DANGEROUS});
                grunt.log.ok();
            }
        }
    });

    /**
        creates a data structure that holds data for all struct vars you'd like to create

        1. get all the htm files
        2. add in data for that htm file for helpHashTags struct (1 per file, it gets h1 tags and agreement there is only one)
        3. parse the file to ffind any <A href tags of 'forCSH' class (could be multiple per file)
            will get one entry in 'csLookup' struct for each of these tags.

        Doing this simultaensoulsy, rather than building up the hash of each struct one at a time, because if you did that
,        you'd have to look through the htm files for each struct you want to get data for

    */
    function generateHelpData() {

        // gather all .htm files friom help dir
        commonRoot = DESTDIR + "assets/";
        helpPath = helpContentMapping.src;
        fullHelpPath = DESTDIR + helpPath;
        //fullHelpPath = commonRoot + "help/" + PRODUCT + "/";
        htmFilepaths = grunt.file.expand(fullHelpPath + "**/*.htm");

        myStructs = {};
        // structs to fill up
        helpHashTags = "helpHashTags";
        csLookup = "csLookup";
        myStructs.helpHashTags = []; // structs being generated
        myStructs.csLookup = {};

        // for each of ithe files, create the struct data
        relativeTo = commonRoot + "js/";
        for ( htmFilepath of htmFilepaths ) {

            //fullFilepath = DESTDIR + htmFile;
            var $ = cheerio.load(fs.readFileSync(htmFilepath, "utf8")); // get a DOM for this file using cheerio

            /*
                ENTRY FOR 'HELP HASH TAGS' STRUCT
                This is the <h1> data in the file.
                There is an agreement that there should be only one per documentation file.
                So, if you encounter more than one; fail
            */

            $('h1').each(function() {  // gets each 'h1' selector
                // check if more than one
                if ( myStructs[helpHashTags].hasOwnProperty(htmFilepath) ) {
                    grunt.fail.fatal("Error encountered generating Help hash tags from documentation.\n"
                        + "\nFile: "
                        + htmFilepath
                        + " has more than one h1'\n"
                        + "There is an agreement that there can only be one h1 per documentation file!");
                }
                // put in key fora this
                text = $( this ).text();
                relPath = path.relative(relativeTo, htmFilepath);
                myStructs[helpHashTags].push({'url':relPath, 'title': text});
            });

            /**
                ENTR(IES) FOR 'CS LOOKUP STRUCT
                (VARIABLE # PER FILE)
                This will be each <a href tag which is of the 'ForCSH' class.

                <a href=stuff, name=somename, class='ForCSH'>stuff</a>

                --> <name>: <filepath relative to content>#<name>

            */

            // parse all <a href tags of the 'for csLookup' class
            contentLoc = fullHelpPath + "Content/";
            $('a.ForCSH').each(function() { // go through each script tag
                name = $( this ).attr('name');
                // if already an entry by this name (from this or some other file), fail out
                if ( myStructs[csLookup].hasOwnProperty(name) ) {

                    /**
                        do a grep for this name in the help file root, so they can see wehre all
                        the dupes are occuring, and print this to the user in the fail msg
                    */
                    var shellStr, grepCmdOutput;
                    var currCwd = process.cwd(),
                        grepCmd = 'grep -r "' + name + '" .';

                    grunt.file.setBase(contentLoc); // switches grunt to the bld output
                    shellStr = shell.exec(grepCmd, {silent:true}); // runs the cmd; shellJs runs cmds syncronously by default
                    grepCmdOutput = shellStr.stdout; // cmd output
                    grunt.file.setBase(currCwd); //  switch back before continuing
                    var failMsg = "\n\nWhile processing file: "
                        + htmFilepath
                        + "\nfound multiple <a href tags of class 'ForCSH' having 'name' attribute: '"
                        + name + "'"
                        + "\n\nIt could be that the first occurance was in a separate htm documentation file,"
                        + " but there should only be one such entry among ALL the documentation files."
                        + "\n\nOutput of '" + grepCmd + "' (executed from " + contentLoc + "):\n\n"
                        + grepCmdOutput;
                    //grunt.fail.fatal(failMsg); // leave this out for now while issue being addressed
                }

                // what is relative to content
                relevant = path.relative(contentLoc, htmFilepath);
                finalPath = relevant + "#" + name;
                myStructs[csLookup][name] = finalPath;
            });

        }

        return myStructs;

    }

                                                                    // ======== CONSTRUCTOR FILES ======= //

    /**
        Generate any of the auto-generated constructor files for the build.

        [[constructor file contains a series of constructors,
        which use direct inheritance infrastructure to represent XD metadata]]

        There are two directories used for the purpose of constructor files.
        1. assets/js/constructor/xcalar-idl/xd/
            This is the submodule of the xcalar-gui project
            used to check files in to git repo.
        2. assets/js/constructor
            This is the dir where the build will actually use the files from.
        So for any of the constructor files you'd want to check in to git
        repo, initially put them in 1, and for those which you only care about the bld using it,
        (ex., A_construcotr_version which just displays info on the GUI about
        the build version), put them in to 2.
        And once everything is done, copy all the constructor files in 1., in to 2.


    */
    grunt.task.registerTask(CONSTRUCTOR_FILES, "Generate additional js constructor file(s) for the build", function() {

        grunt.log.debug("Schedule tasks to Autogen constructor files,"
            + " then copy the auto-generated constructor files, from:\n"
            + grunt.config('copy.constructorFiles.cwd')
            + " to:\n"
            + grunt.config('copy.constructorFiles.dest'));

        grunt.task.run(GENERATE_CURR_PERS_CONSTRUCTOR_FILE);

        // next constructor file is only to show info about the bld to users.
        // devs don't need in their build, and if you auto-gen it, it will
        // cause it to show up in their 'git status', so skip for dev blds
        if ( BLDTYPE != DEV && !WATCH_CURR_PROCESSING ) {
            grunt.task.run(GENERATE_GIT_VAR_DEC_FILE);
        }
        // copy all constructor files from the xcalar-idl/xd submodule, in to constructor dir used by bld
        grunt.task.run('copy:constructorFiles');

        if ( !KEEPSRC && SRCROOT != DESTDIR ) {
            grunt.task.run(CLEAN_CONSTRUCTOR_SRC);
        }
    });

    /**
        auto-gen the constructor version file.
        context: The GUI displays useful info related to the project version.
            Does this by calling variables that (should) hold that data.
            This task creates a central file that decalares and instantiates these variables
            within project scope.
        This file is auto-generated, and is unique for each build you run;
        it is not a file you'd ever want to check in to git therefore it will NOT
        go in to the assets/js/constructor/xcalar-idl/xd/ directory (constructorMapping.dest)
        where the other constructor files are going, but rather should go directly in to
        the build constructor directory.
        Similarly, for dev builds we don't want to generate this file.  Because 1. developers
        won't use it and 2. if it's generated, it will show up as a new file in their
        workspace under 'git status' requiring them to delete it
    */
    grunt.task.registerTask(GENERATE_GIT_VAR_DEC_FILE, function() {

        // path to file to auto generate
        var filepath = DESTDIR + constructorMapping.dest + "A_constructorVersion.js";
        grunt.log.writeln("Expected filepath of constructor file... " + filepath);

        var varData = { // content to put in to file
            'gBuildNumber': getBuildNumber(),
            'gGitVersion': getGitSha(),
        }
        var content = "";
        var key;
        for ( key of Object.keys(varData) ) { // add the content in
            content = content + "\nvar " + key + " = '" + varData[key] + "';";
        }

        writeAutoGeneratedFile(filepath, content); // tacks a standard autogen comment and logs before writing file

    });

    /**
         auto-gens: E_persConstructor.js
         context:
    */
    grunt.task.registerTask(GENERATE_CURR_PERS_CONSTRUCTOR_FILE, function() {

        // path of file to auto generate
        var filepath = DESTDIR + constructorMapping.src + "E_persConstructor.js";

        var templateSrc = "site/render/template/constructor.template.js"; // templating file to use to generate
        var templateFilepathAbs = DESTDIR + templateSrc;

        var str = fs.readFileSync(templateFilepathAbs).toString();
        var template = _.template(str);
        var parsedStr = template({
            "version": null,
            "isCurCtor": true,
        });
        parsedStr = parsedStr.trim() + "\n";

        writeAutoGeneratedFile(filepath, parsedStr);
    });

    /** remove files/dirs unneeded needed only for generating constructor files */
    grunt.registerTask(CLEAN_CONSTRUCTOR_SRC, "There are some files required to gerneate the constructor files.  You can remove them when done.", function() {

        grunt.log.writeln(("\nDelete files/dirs necessary for generating constructor files, now that they have been generated\n").bold);

        /**
           front-end developers develop the constructor files within their git repo, in constructorMapping.src
            In the final build, these files need to be in constructorMapping.dest.
            Doing this with cp instead of mv, so that in case src and dest dir are same, won't disrupt.
            So, once the constructor tasks are complete, now you want to delete the src
        */
        var constructorSrcFull = DESTDIR + constructorMapping.src;
        grunt.log.writeln("Delete src folder for constructor files: " + constructorSrcFull);
        grunt.file.delete(constructorSrcFull, {force:FORCE_DELETE_DANGEROUS});

        // now dleete anything required but not needed in final bld
        for ( requiredItem of constructorMapping.required ) {
            fullPath = DESTDIR + requiredItem;
            grunt.log.write("Delete file/dir " + fullPath + " ... ");
            grunt.file.delete(fullPath, {force:FORCE_DELETE_DANGEROUS});
            grunt.log.ok();
        }

    });

    /**
        Given a list of filepaths, set the 'src' attribute of the copy:custom target
        and run the target to copy in those filepaths.

        dependencies: (req) list of strings that are filepaths that are required.
            If they are REL., will assumte relative to src
        @src: optional (defaults to SRCDIR) where to get the dependencies from.  Will normalize to abs.
        @dest: optional (defaults to DESTDIR), where to copy the dependencies to
        @fromDepth: optional (Defaults to entire dependency path) - where to start retaining the dir structure from (will convert to abs. then split on that)
            @todo: ARG    @filter: list of files or dirs to exclude
    */
    function resolveDependencies(dependencies, src, dest, fromDepth) {

        src = typeof src  !== 'undefined' ? src  : SRCROOT;
        dest = typeof dest  !== 'undefined' ? dest  : DESTDIR;

        if ( !grunt.file.isPathAbsolute(src) || !grunt.file.isPathAbsolute(dest) ) {
            grunt.fail.fatal("Trying to resolve dependencies, "
                + " but either src or dest are not absolute paths..."
                + "\n src: " + src + "\n dest: " + dest
                + "  logic error contact jolsen@xcalar.com.");
        }
        if ( fromDepth ) {
            if ( grunt.file.isPathAbsolute(fromDepth) ) {
                if ( grunt.file.doesPathContain(src, fromDepth) ) {
                    grunt.fail.fatal("Trying to resolve dependencies... "
                        + " want to copy dependencies in from " + src
                        + " and only maintain dir structure begininng @ start"
                        + dirStructureFrom
                        + "\nThis start is an absolute path, but not descendent of the src."
                        + "\nLogic error in gruntfile; please contact jolsen@xcalar.com");
                }
            }
            else {
                // make it rel to src
                fromDepth = src + fromDepth;
            }
        }
        else {
            fromDepth = src;
        }

        grunt.log.writeln(("\bResolve any file/dir dependencies for building filetype"));

        // clear out current src, and reset dest to
        grunt.config('copy.resolveDependencies.src', []);
        grunt.config('copy.resolveDependencies.cwd', fromDepth);
        grunt.config('copy.resolveDependencies.dest', dest);
        var srclist = [],
            glob = false;
        var dependency, dependencyAbsPath;
        for ( dependency of dependencies ) {
            grunt.log.debug("Next dependency: " + dependency);
            if ( dependency.match(/\*/g) ) {
                grunt.log.writeln("this is a globbing pattern! can't do any checks");
                glob = true;
            }
            // if its not a glob can check if exists and make sure its desc from src if abs.
            if ( !glob ) {
                grunt.log.debug("dependency " +  dependency + " is not a glob");
                if ( grunt.file.isPathAbsolute(dependency) ) {
                    grunt.log.writeln("this is an absolute path");
                    // make sure rel. to src
                    if ( grunt.file.doesPathContain(src, dependency) ) {
                        dependencyAbsPath = dependency;
                    }
                    else {
                        grunt.fail.fatal("Supplied dependency to resolveDependencies that is an abs. path, "
                            + " but not descendenct from src requested to get dependency from."
                            + "\nDependency: " + dependency
                            + "\nSrc to get dependency from: " + src);
                    }
                }
                else {
                    dependencyAbsPath = src + dependency;
                }

                grunt.log.debug("abs path have now: " + dependencyAbsPath);
                // if dir, glob for entire thing
                if ( grunt.file.isDir(dependencyAbsPath) ) {
                    dependencyAbsPath = dependencyAbsPath + "**/*";
//                    srclist.push(dependencyRelSrc + "**/*");
//                    srclist.push(dependencyRelPath + "**/*");
                }
                else if ( !grunt.file.isFile(dependencyAbsPath) ) {
                    grunt.fail.fatal("A dependency pass to resolveDependencies is not a file or dir!\n"
                        + dependency
                        + "\n (Looking for existence @ abs path determined as:)\n"
                        + dependencyAbsPath);
                }

            }
            else {
                grunt.log.debug("Dependency " + dependency + " is a glob");
                // check if begins with '/' to determine if abs path...
                if ( dependency.startsWith(path.sep) ) {
                    dependencyAbsPath = dependency;
                }
                else {
                    dependencyAbsPath = src + dependency;
                }

            }
            // get only part rel they want
            grunt.log.debug("Get only relative part of dir structutre of " + dependencyAbsPath + " using a split on " + src);
            relkeep = path.relative(fromDepth, dependencyAbsPath);
            grunt.log.debug("keep: " + relkeep);
            srclist.push(relkeep);
        }
        // if any dependencies that need to be resolved, schedule this task
        if ( srclist.length > 0 ) {
            grunt.log.warn("There are dependencies required to build files of this type that are missing from the bld.  Copy them in...");
            grunt.config('copy.resolveDependencies.src', srclist);
            grunt.task.run('copy:resolveDependencies');
        }
    }

    /**
        Given a list of files, dirs, or globbing patterns,
        SCHEDULE CUSTOM CLEAN TASK to remove them.
        - If rel. paths supplied, will assume rel. to DESTDIR
        - For non-globs, check if file/dir exist and only then clean
        -- since this calls 'clean' plugin, the effect of this function is that a task will
        only get SCHEDULED in the task queue - not removed by time
        the function exists.

        Used mainly for removing dependeencies in cleanup for
        specific filetypes
        This is a function rather than a task because you need to pass the lit

    */
    function removeContent(content, relTo) {

        relTo = typeof relTo  !== 'undefined' ? relTo  : DESTDIR;

        grunt.log.debug("in remove content w " + content);
        // clear out current src
        grunt.config('clean.custom.src', []);
        var dependency;
        var removelist = [], // to set as src to clean task
            glob = false;
        var removePath;
        for ( removePath of content ) {
            grunt.log.writeln("Remove: " + removePath);
            if ( removePath.match(/\*/g) ) {
                grunt.log.debug("this is a globbing pattern! can't do any checks");
                glob = true;
            }
            // if its not a glob can check if exists and make sure its desc from src if abs.
            if ( !glob ) {
                if ( !grunt.file.isPathAbsolute(removePath) ) {
                    removePath = relTo + removePath;
                }
                // now if it exists only get rid of it, otherwise don't worry about it
                if ( !grunt.file.exists(removePath) ) {
                    grunt.log.writeln("\n" + removePath
                        + " required, but does not exist in bld "
                        + "(probably a watch scenario of HTML, where required dirs were copied directly in to staging area)");
                    continue;
                }
            }

            removelist.push(removePath);
        }
        // if found any paths to remove, schedule clean task
        if ( removelist.length > 0 ) {
            grunt.log.debug("Found paths to remove: " + removelist);
            grunt.config('clean.custom.src', removelist);
            grunt.task.run('clean:custom');
        }


    }

                                                                // ======== CSS SECTION ======= //
    /**
        Generate CSS files from less files in the src code, remove uneeded less files
    */
    grunt.task.registerTask(BUILD_CSS, 'Generate the CSS for the build from dev src code', function() {

        grunt.task.run('less:dist');

        if ( !KEEPSRC && SRCROOT != DESTDIR ) {
            grunt.task.run(CLEAN_CSS_SRC);
        }
    });

    /**
        Deletes uneeded lss src code from bld
    */
    grunt.task.registerTask(CLEAN_CSS_SRC, function() {

        /**
            delete all less files in the less src.
            (Note: delete files individually, rather than deleting entire src dir!
            in case one day, that dir has other files, or is same as bld root, or other dir!)
        */
        grunt.log.writeln(("\nRemove less files from build\n").bold);
        lessFiles = grunt.file.expand(DESTDIR + cssMapping.src + "**/*.less");
        for ( var lessFile of lessFiles ) {
            grunt.log.write("less file: " + lessFile + " DELETE ... ");
            grunt.file.delete(lessFile, {force:FORCE_DELETE_DANGEROUS});
            grunt.log.ok();
        }
        /**
            delete any files/dirs specifically required for the purpose of generating the css
            (note - right now would be less in partials/, and those less files would get removed
            in above part, and then final clean would remove the empty dirs,
            but for watch functionality, you'd copy in the essentials but no clean at end so doing this
        */
        grunt.log.writeln(("\nRemove files/dirs from bld required only for generating css\n").bold);
        removeContent(cssMapping.required);

    });

                                                                // ======== HTML SECTION ======= //

    /**
        Generate full bld HTML from project src HTML via templating, internationalization,
        prettifying, minifying, etc.

        The flow of generating the bld HTML is as follows:

        ((Initial Src)) --> ((Staging Area I)) --> ((Staging Area II)) --> Final Dest

                            Templating                 Prettifying/Minifying
                            (tasks which req.       (tasks which do NOT
                            outside files)             req. outside files)

        Staging Area I:
            In case dest same as src
            The reason why:
            1. In case src html is same as final dest dir,
                 to preserve src files if you want to, while still keeping same filenames
            2. Also, this let's yuou go through every html file in bld src,
                and only what gets templated gets directed outside the staging area,
                so you end up with only the build HTML - and can just delete the HTML staging area I

        Staging Area II:
            In case dest has HTML files that are not related to bld.
            (was example in bld - HTML dest was to be root,
            but there were autogenerated HTML files that were being picked up
            in minify/prettify.
            So putting here, allows an area to just work on build files themselves.
            and you still don't need to know what they are apriori


    */
    grunt.task.registerTask(BUILD_HTML, 'Generate HTML from dev src by resolving includes, templating, etc.', function() {

        // copy ENTIRE html src dir - even files which will be uneeded in bld - to initial staging dir
        grunt.task.run('copy:stageHTML');

        // perofrm all processing tasks (templating, internationaliation, etc.) within the staging dirs
        grunt.task.run(PROCESS_HTML);

        // copy everything in final Staging area to final destination
        grunt.task.run('copy:destHTML');

        // Done with staging areas.  get rid!
        grunt.task.run('clean:htmlStagingI');
        grunt.task.run('clean:htmlStagingII');

        /**
            html clean:
            Will clean html only at very end in finalize,
            because js minification uses one
            of the files (site.html)
        */
    });

    grunt.task.registerTask(CLEAN_BUILD_SECTIONS, function() {

        // clean HTML src of uneeded files/dirs
        if ( !KEEPSRC && SRCROOT != DESTDIR ) {
            grunt.log.debug("don't want to keep stale html!");
            grunt.task.run(CLEAN_HTML_SRC);
        }

    });

    /**
         clean build of uneeded files used for generating bld HTML
    */
    grunt.task.registerTask(CLEAN_HTML_SRC, function() {

        /** remove HTML files that when templated, got written to new filepaths
            (else you'd be deleting a processed file you want to keep!)
        */
        grunt.log.writeln(("\nDelete un-processed, "
            + " templated HTML files used to genrate the bld files, "
            + " if any remain "
            + " (they might have been written over during bld process, "
            + " or, if watch task, might have been copied in directly to the staging area\n").bold);
        var filepath;
        for ( filepath of htmlWaste ) {
            // these filepaths get collected when generating html, making best guess at what would be their real location in the bld..
            // but if you are watching,
            // then the files needed were copied in directly to the staging area. so they woin't exist here. so check if file exists to avoid confusing warnings
            // now that this has evolved should relook at this there is a better way
            if ( grunt.file.exists(filepath) ) {
                grunt.log.write("\tDelete untemplated bld file : " + filepath + "... ");
                grunt.file.delete(filepath, {force:FORCE_DELETE_DANGEROUS});
                grunt.log.ok();
            }
        }

        /**
            delete unecessary dirs and files you don't waant anymore from the src folder
            i need render for making the constructors!! (required args are rel. to DESTDIR);
        */
        grunt.log.writeln(("\nDelete dirs and files designated only for build purpose that were within src, if any\n").bold);
        removeContent(htmlMapping.required);

    });


    /**
        tasks to be done to the HTML files, while they are in the temporary staging areas
        (prettifying, minifying, internationzliation, templating, etc.)

        Invariant start:
            All src HTML, and files needed to generate final dest HTML, should exist in Staging Area I
        Invariant end:
            a file in Staging Area II iff it is a final bld HTML file

        Task Order Dependencies:
            tags task must run before htmlmin task (the comment tags depends on gets removed during htmlmin)

    */
    grunt.task.registerTask(PROCESS_HTML, function() {
        /**
            phase I : tasks requiring outside files to complete.  To be performed within staigng area I
            all src html should exist in staging area I when this phase begins.
        */
        grunt.task.run('includes:staging');
        grunt.task.run(TEMPLATE_HTML); // templated files written to staging area II during this task

        /**
            phase II : tasks which do not rely on any outside files.
            files were put here during templating.
        */

        grunt.task.run('scriptlinker:stagingII'); // auto-generate additional script tags needed in to index.html (mixpanelAzure)
            // do BEFORE htmlmin - 'scriptlinker' knows where to insert tags by scanning the html and looking
            // for comment <!-- start auto template tags -->; this comment will get removed during htmlmin
        grunt.task.run('prettify:stagingII');
        grunt.task.run('htmlmin:stagingII'); // staging area II now has all, and only, completed bld files

        /**
            Extra step:
            (context): when you update script tags in the bld html after
            js minification, using cheerio.  Cheerio leaves a bunch of
            blank lines, and so have to do a final prettification on those
            files, once minification is done.
            The final prettification will get all the html files in the dest dir
            for html files, within the bld.
            However, our dest dir for html files in the bld, is actually the root
            of the build.
            So this final prettiifcation, will gather all html files in the
            entire bld.
            This ends up getting 3rd party, etc.,  Lots of html files you wouldn';t
            want to touch.
            So, to keep this consistent, get a list of the final set of bld files,
            rel to the html dest dir.
            Could gather the list dynamically as you're writing them during templating,
            but then if you ever change the loc of the staging dir, you need that
            context... just put it here so it's clearer... at this point you have
            all the bld html... just make a list of what's there...
            Needs to be a task rather than a function since you're only scheduling tasks above..
        */
        grunt.task.run("getBldHTMLListing");

    });

    grunt.task.registerTask("getBldHTMLListing", function() {

        grunt.log.writeln("Before removing final HTML staging directory,"
            + " get final list of HTML files in the bld,"
            + "for follow-up tasks that might need to be done ONLY on bld html"
            + " once HTML portion of BLD has been completed"
            + "\n(prettification post-js min in installer blds an example)");

        // get list of all the files in the staging dir II, rel to it
        HTML_BUILD_FILES = grunt.file.expand({'cwd':HTML_STAGING_II_ABS}, "**/*.html");
        var bldFile;
        grunt.log.writeln("Build files found:");
        for ( bldFile of HTML_BUILD_FILES ) {
            grunt.log.writeln("\t" + bldFile);
        }
    });

    /**
        Generate valid bld HTML from un-processed, templated files
        (excluding dirs/files specified)

        Does so by calling 'genHTML' on each file in the bld.
        genHTML takes a filepath to an HTML file and does the following:

            1. render if/else logic within the src HTML
            2. internationalization
            3. Product name strings normalized (they all say 'xcalar design' atow; for XI, change it to 'xcalar insight'

        Once file has been templated, delete the original file so you don't end up
        with stale HTML.

    */
    grunt.task.registerTask(TEMPLATE_HTML, function() {
        /**
            get filespaths, rel to staging Dir, of all the html
            files to do templating on, and map in to STAGING II, retaining dir struc.
            - grunt.file.expand will return filepaths, relative to 'cwd' option,
                that match patterns
            - if main bld task, youw ill want to get all the html files sans exclusions,
                 but if watch task might only want to template a single file, so look
                to template string for src for html processing tasks
        */

        var htmlFilepaths = [],
            matchPatterns = [],
            templatingSrc = grunt.config(STAGE_HTML_TEMPLATE_KEY); // dont just get all html but what template string specifies, in case watch task

        if ( grunt.file.isFile(templatingSrc) ) {
            // do not do a grunt file expand - just use this single htmlfilepath
            grunt.log.debug("in if");
            htmlFilepaths = [HTML_STAGING_I_ABS + templatingSrc];
        }
        else {
            grunt.log.debug("get a glob");
            var mainGlob = HTML_STAGING_I_ABS + templatingSrc; // if just one file, or a current glob, this will be sufficient
            if ( grunt.file.isDir(templatingSrc) ) { // if its a dir, get all html files nested within
                mainGlob = mainGlob + "**/*.html";
            }
            matchPatterns.push(mainGlob);
            // if this a main bld task... also take care of the exclusion patterns...
            if ( !IS_WATCH_TASK ) {
                for ( exclude of htmlMapping.exclude ) {
                    if ( grunt.file.isDir(exclude) ) {
                        grunt.log.debug("Add match pattern for Exclusiun dir: " + exclude);
                        matchPatterns.push("!" + HTML_STAGING_I_ABS + exclude + "**");    // excludes this dir and everything within it
                    }
                    else {
                        grunt.log.debug("Add match pattern for excludeion file: " + exclude);
                        matchPatterns.push("!" + HTML_STAGING_I_ABS + exclude); // excludes this particular file
                    }
                }
            }
            htmlFilepaths = grunt.file.expand(matchPatterns);
        }
        grunt.log.debug("# files to template: " + htmlFilepaths.length
                + "staging dir @: " + HTML_STAGING_I_ABS
                + "match patterns: " + matchPatterns);
        grunt.log.debug("html filepaths: " + htmlFilepaths);

        var filepath;
        var skipfile = false;
        for ( filepath of htmlFilepaths ) {
            grunt.log.writeln(("`== Template HTML from templated file @ "['yellow'] + filepath + " ==`"['yellow']).bold);
            // genHTML will generate and write a new HTML file, from the templated file at filepath.
            if ( grunt.file.doesPathContain(HTML_STAGING_I_ABS, filepath) ) {
                skipfile = false;
                /**
                    There are some html files don't want to template.  For example, partials and utils.
                    Files not to template are in the global DONT_TEMPLATE_HTML at top of script.
                    If you don't filter those out now, then
                    if you try to template the entire html src, you will end up with
                    entire dir of templated files in the 2nd staging dir, such as partials and utils.
                    Then, as the final step in the html bld process,
                    all of these will be transferred in to the final bld.
                    If for example src and bld output are same, you'll end up putting these uneeded
                    dirs in the user's src which will then show up in their git status
                */
                var dontTemplate;
                for ( dontTemplate of DONT_TEMPLATE_HTML ) {
                    // remem everything in the 1st staging area is rel. to the html src
                    if ( (grunt.file.isDir(dontTemplate) && grunt.file.doesPathContain(HTML_STAGING_I_ABS + path.relative(htmlMapping.src, dontTemplate), filepath)) ||
                         (grunt.file.isFile(dontTemplate) && HTML_STAGING_I_ABS + path.relative(htmlMapping.src, dontTemplate) == filepath) ) {
                            // the requireds are rel. to the type src
                            grunt.log.writeln("\tWon't template " + filepath + " - it's designated as a file to skip, or in a dir to skip");
                            skipfile = true;
                            break;
                    }
                }
                if ( !skipfile ) {
                    pathRelToHtmlSrcWithinBld = path.relative(HTML_STAGING_I_ABS, filepath);
                    genHTML(filepath, getTemplatingOutputFilepaths(pathRelToHtmlSrcWithinBld));
                }
            }
            else {
                grunt.fail.fatal("One of the filepaths to template: "
                    + filepath
                    + " is not desc. from the staging area:\n"
                    + HTML_STAGING_I_ABS
                    + "\n.Workflow might have changed for templating");
            }
        }

    });

    /**

        Takes an HTML file with templating code, and resolves this and generates
        a fully HTML from that.

        htmlFilepath: (required, string)
            filepath of HTML file with template code you want to resolve.
            If ABS path - tries to get file at abs path.
            If REL path - tries to get file relative to 'templatedRoot'

        output: (optional, List)
            A list of all the destinations the templated file should be written to.
            If not supplied, same as htmlFilepath (rel srcRoot), and writes that to destRoot

        srcRoot: (optional, string)
            Dir to get filepath relative to, if it is a rel. filepath
            Defaults to STAGING_DIR_I

        destRoot: (optional, string)
            Dir to write templated output file(s) relative to, if they rel filepaths
            Defaults to STAGING_DIR_II

        EX 1:
            filepath = "A/test.html"
            output = ["testQ.html"]
            srcRoot = "/home/jolsen/xcalar-gui/site/"
            destRoot = "/home/jolsen/xcalar-gui/"

            --> (1) will look for HTML file at:
                    /home/jolsen/xcalar-gui/site/A/test.html
            --> (2) Will resolve templating logic, internationalization, etc., and write file to:
                    /home/jolsen/xcalar-gui/testQ.html""

        EX2:
            filepath = "A/test.html"
            srcRoot = destRoot = "/A/B/"

            --> (1) will look for HTML file at:
                    /A/B/A/test.html
            --> (2) will resolve templ,ating logic, internationalazation, etc., and write to:
                    /A/B/A/test.html
                    overwriting the untemplated file

    */
    function genHTML(htmlFilepath, outputFiles, srcRoot, destRoot) {
        lang = "en";
        landCode = (lang === "en") ? "en-US" : "zh-CN";
        dicts = require(SRCROOT + 'assets/lang/' + lang + '/htmlTStr.js');
        var tutorMap = {
            "datastoreTut1.html"        : "datastoreTut1",
            "datastoreTut1DemoMode.html": "datastoreTut1Demo",
            "datastoreTut2.html"        : "datastoreTut2",
            "workbookTut.html"          : "workbookTut"
        };

        if ( !srcRoot ) {
            srcRoot = HTML_STAGING_I_ABS;
        }
        if ( !destRoot ) {
            destRoot = HTML_STAGING_II_ABS;
        }

        /**
            htmlFilepath, if abs., should be within staging dir.
            But want to know (1) dest it will go in final bld
            (2) originating location within bld
            because want to determine
            if original file being overwritten during templating process
            protects in the case that src and dest dirs are same.
        */
        var relPart,
            unprocessedFileBldPath;
        if ( !grunt.file.isPathAbsolute(htmlFilepath) ) {
            htmlFilepath = srcRoot + htmlFilepath;
        }
        if ( grunt.file.doesPathContain(HTML_STAGING_I_ABS, htmlFilepath) ) {
            relPart = path.relative(HTML_STAGING_I_ABS, htmlFilepath);
        }
        else {
            grunt.fail.fatal("The filepath specified is not relative to the staging dir"
                + htmlFilepath
                + "\nLogic error, please contact jolsen@xcalar.com");
        }
        grunt.log.debug("html filepath: "+ htmlFilepath + " rel: " + relPart);
        unprocessedFileBldPath = DESTDIR + htmlMapping.src + relPart;
        // make sure it exists.. to be on the safe side... since assuming where it is based on current workflow...
        //  h owever, during watch task - it is likely this won't exist, since the watched file might have been
        // copied directly in to the staging area
        if ( !grunt.file.exists(unprocessedFileBldPath) && !IS_WATCH_TASK) {
            grunt.fail.fatal("During HTML templating, got a file: "
                + htmlFilepath
                + "\nIt should be within the HTML staging directory at this point."
                + " Trying to determine it's original path within the bld,"
                + " so can determine if it gets overwritten during templating process.\n"
                + "Location determines as: "
                + unprocessedFileBldPath
                + ", However, this path does not exist."
                + "\nThere has likely been a logic change in workflow of HTML processing"
                + " which needs to be accounted for.");
        }

        /** output files: should be a path where templated file should be written,
            or list of files it should be written to.
            Put all in a list, and converted each to an abs path
        */
        if ( outputFiles ) {
            if ( typeof(outputFiles) == 'String' ) {
                outputFiles = [outputFiles];
            }
            else if ( !Array.isArray(outputFiles) ) {
                grunt.fail.fatal("'output' arg to genHTML not a Stirng or an Array.");
            }
        }
        else {
            // wasn't defined
            grunt.log.debug("output wasn't defined");
            outputFiles = [relPart];
        }
        for ( var i = 0; i < outputFiles.length; i++ ) {
            if ( !grunt.file.isPathAbsolute(outputFiles[i]) ) {
                outputFiles[i] = destRoot + outputFiles[i];
            }
        }

        /**
            get html contents as a string, from the src HTML file.
            load this in to templater
        */
        var html = fs.readFileSync(htmlFilepath).toString();
        var template = _.template(html);

        /**
            configure dictionary of templating options for each of the output files
        */
        dicts.product = PRODUCT;

        // dicts options when generating one HTML file
        var overwritten = false;
        var filename, destFilepath;
        if ( outputFiles.length == 1 ) {
            destFilepath = outputFiles[0];
            filename = path.basename(destFilepath);
            if ( filename == 'userManagement.html' ) {
                grunt.log.writeln("found usermanagement...");
            }

            if (tutorMap.hasOwnProperty(filename)) {
                grunt.log.debug("tutor map");
                dicts.isTutor = true;
                // it should be found in html_en's tutor obj
                var tutorName = tutorMap[filename];
                // overwrite the dicts.tutor[tutorName] to dicts.tutor.meta,
                // so all walkthough.html can just use dicts.tutor.meta
                // to find the string that needed
                dicts.tutor.meta = dicts.tutor[tutorName];
                dicts.tutor.name = tutorName;
            } else {
                dicts.isTutor = false;
                dicts.tutor.name = "";

                if (filename === "unitTest.html" || filename === "unitTestInstaller.html") {
                    dicts.isUnitTest = true;
                } else {
                    dicts.isUnitTest = null;
                }

                dicts.isTarballInstaller = true;
            }

            // dicts configured; template
            templateWrite(destFilepath);

            // finally, check if it mapped to the same place as the src.
            if ( unprocessedFileBldPath == destFilepath ) {
                overwritten = true;
            }

        } else {
            /**
                filepath mapes to multiple HTML files.
                dicts will get configured differently
                (only used for installer build)
            */
            for (var i = 0; i < outputFiles.length; i++) {
                destFilename = path.basename(outputFiles[i]);
                destFilepath = outputFiles[i];
                if (destFilename === "install-tarball.html") {
                    dicts.isTarballInstaller = true;
                } else {
                    dicts.isTarballInstaller = null;
                }

                // dicts configured for this file; template
                templateWrite(destFilepath);

                // finally, check if it mapped to the same place as the src.
                if ( unprocessedFileBldPath == destFilepath ) {
                    overwritten = true;
                }
            }

        }

        if ( !overwritten && grunt.file.exists(unprocessedFileBldPath) ) {
            grunt.log.debug("\tOriginal file does not appear to be overwritten... "
                + " Location of original file (now stale) determined as: "
                + unprocessedFileBldPath);
            // this will be the full path within the staging dir.  need to get it rel. to that,
            // because the stale file will be in the src.
            htmlWaste.push(unprocessedFileBldPath);
        }

        // now that dicts is configured for a particular file use case, generate
        // HTML contents from the templated file, and write contents as a file at given filepath
        // @destpath: path to write result to (if rel. will be rel. to destdir, as configured at top of maion function)
        function templateWrite(destpath) {

            // generate HTML string from templating
            grunt.log.debug("\tTemplate file..." + dicts);
            var parsedHTML = template(dicts);

            // if this is an XI build, replace product 'xcalar diesng' names
            if ( PRODUCT == XI ) {
                parsedHTML = updateStringProductName(parsedHTML);
            }

            // add in header comment (comment starts with ! will not be removed by grunt htmlmin)
            parsedHTML = AUTOGENWARNINGHTML + parsedHTML;

            // write the file to the proper destination
            // add to growing list of bld html
            if ( !grunt.file.isPathAbsolute(destpath) ) {
                destpath = destRoot + path.sep + destpath;
            }
            grunt.log.write("\tWrite templated file @ " + (destpath).green + " ... ");
            grunt.file.write(destpath, parsedHTML);
            grunt.log.ok();
        }
    }

    /**

        Given filepath to a file, within the src of html within bld,
        return a list which contains the rel filepaths within the bld,
        of all the files it should template to.
        If filepath is abs: will try to get portion rel to either src or bld.
        If it is rel, will use as is.
        (For now to make this work until genHTML optimized - return String or list)
    */
    function getTemplatingOutputFilepaths(filepath) {

        /**
            mapping such that:
            (key): path to unprocessed file in staging dir I
            (val): path(s) you want in final bld of the processed, templated file
            [some are two, because those files are files that when you template, you save in to 2 sep files]
        */
        htmlTemplateMapping = {
            "dashboard.html": ["dashboard.html"],
            "datastoreTut1.html": ["assets/htmlFiles/walk/datastoreTut1.html"],
            "datastoreTut1DemoMode.html": ["assets/htmlFiles/walk/datastoreTut1DemoMode.html"],
            "datastoreTut2.html": ["assets/htmlFiles/walk/datastoreTut2.html"],
            "dologout.html": ["assets/htmlFiles/dologout.html"],
            "extensionUploader.html": ["services/appMarketplace/extensionUploader.html"],
            "index.html": ["index.html"],
            "install.html": ["install.html", "install-tarball.html"],
            "login.html": ["assets/htmlFiles/login.html"],
            "tableau.html": ["assets/htmlFiles/tableau.html"],
            "testSuite.html": ["testSuite.html"],
            "undoredoTest.html": ["undoredoTest.html"],
            "unitTest.html": ["unitTest.html"],
            "unitTestInstaller.html": ["unitTestInstaller.html"],
            "userManagement.html": ["assets/htmlFiles/userManagement.html"],
            "workbookTut.html": ["assets/htmlFiles/walk/workbookTut.html"],
        };

        var templatedFilepathList = [];
        if ( grunt.file.isPathAbsolute(filepath) ) {
            grunt.fail.fatal("Gave abs path for trying to determine templating output filepaths"
                + filepath
                + "\nShould supply a rel path to the file, beginning at the src root of HTML within the bld");
        }

        if ( htmlTemplateMapping.hasOwnProperty(filepath) ) {
            templatedFilepathList = htmlTemplateMapping[filepath];
        }
        else {
            templatedFilepathList = [filepath];
        }
        return templatedFilepathList;
    }


                                                                // ======== JS SECTION ======= //
    /**
        This task drives javascript minification and associated clean up tasks.

        1. Configures and executes minification of build javascript,
        2. updates <script> tags in bld HTML to reflect minified filepaths
        3. prettifies the HTML to get rid of blank lines left from 2.
        4. clears out unminified js files and dirs, and files used only for minification process.
    */
    grunt.task.registerTask(MINIFY_JS, 'Minify the Javascript', function() {

        configureUglify(); // configure ethe uglify plugin to determine filepath mappings for minification

        // if bld flag given for rc option, remove debug comments first, before js minification
        if ( grunt.option(BLD_FLAG_RC_SHORT) || grunt.option(BLD_FLAG_RC_LONG) ) {
            grunt.task.run(REMOVE_JS_DEBUG_COMMENTS);
        }
        grunt.task.run('uglify'); // do minification on all but excluded js files
        grunt.task.run(UPDATE_SCRIPT_TAGS); // update the build HTML to reflect new js filepaths
        grunt.task.run('prettify:cheerio'); // using cheerio to remove script tags causes empty whitespaces; prettify again

        // rid bld of the original js files no longer needed, unless running with option to keep full src
        if ( !KEEPSRC && SRCROOT != DESTDIR ) {
            grunt.task.run(CLEAN_JS_SRC_POST_MINIFICATION);
        }
    });

    /**
        Remove debug comments from certain javascript files
        This happens PRIOR to minification, so make sure the file paths
        are the original paths, not the post minification paths
    */
    grunt.registerTask(REMOVE_JS_DEBUG_COMMENTS, function() {

        grunt.log.writeln("Remove debug comments from js build files, prior to minification");

        // get all of the js src code. expand will return abs filepath if abs globbing path supplied
        var jsFiles = grunt.file.expand(DESTDIR + jsMapping.src + "**/*.js");
        var absfilepath, jsFile;
        for ( jsFile of jsFiles ) {
            if ( JS_FILES_NOT_TO_REMOVE_DEBUG_COMMENTS_FROM.indexOf(jsFile) !== -1 ) {
                continue;
            }
            grunt.log.write("Remove debug comments from : " + jsFile + " ... ");
            removeDebug(jsFile);
            grunt.log.ok();
        }
        grunt.task.run(DISPLAY_SUMMARY);
    });

    /**
        Scan through .js file and remove any code block that begins with

        /** START DEBUG ONLY **/
        //and ends with
        /** END DEBUG ONLY **/

    /**
        @filepath : path to file to remove debug comments from
            If rel., will be rel. to current operating directory of Grunt
    */
    function removeDebug(filepath) {
        if ( !grunt.file.isPathAbsolute(filepath) ) {
            grunt.log.warn("Filepath "
                + filepath
                + " for js file to remove debug comments from not abs;"
                + " will get rel. to current operating dir");
        }
        contents = fs.readFileSync(filepath, "utf8");
        contents = contents.replace(/\/\*\* START DEBUG ONLY \*\*\/(.|\n)*?\/\*\* END DEBUG ONLY \*\*\//g, "");
        fs.writeFileSync(filepath, contents);
    }

    /**
        Cleans bld of uneeded js files post minification
    */
    grunt.task.registerTask(CLEAN_JS_SRC_POST_MINIFICATION, 'clean the bld of uneeded js files post-minification', function() {

        // the uglify configuration has all the files we minified in it.
        // go through that, and for each file in there, delete it
        var uglifyConfig = grunt.config('uglify');
        if ( !uglifyConfig ) {
            grunt.fail.fatal("There is no config data for the 'uglify' plugin!");
        }
        var uglifyTarget, srcFile, relPart;
        for ( uglifyTarget of Object.keys(uglifyConfig) ) {
            // get all the src files  - they are full file paths.
            grunt.log.writeln("Src files from minified target: " + uglifyTarget);
            for ( srcFile of uglifyConfig[uglifyTarget].src ) {
                relPart = path.relative(DESTDIR + jsMapping.dest, srcFile);
                if ( !grunt.file.isPathAbsolute(srcFile) ) {
                    grunt.fail.fatal("warning - you have change the configuration of the uglify path so src files are partial - you need to update the cleanJsSrc method as a result!");
                }
                // make sure it's not the name one of theo minified files or you'll end up deleting a minified file
                if ( !uglifyConfig.hasOwnProperty(relPart) ) {
                    grunt.log.write(("\t>>").green + " Unminified file : " + srcFile + " ... delete ...");
                    grunt.file.delete(srcFile, {force:FORCE_DELETE_DANGEROUS});
                    grunt.log.ok();
                }
                else {
                    grunt.log.writeln(("\t>>").red + " Unminified file : "+ srcFile
                        + " should have been overwritten by one of the new minified files already..."
                        + (" Don't delete this file").red);
                }
            }
        }
    });

    /**
        There are some central files where text data to display to the user is displayed.
        Update those files so that occurances of 'xcalar design' say 'xcalar insight' instead.
        This should be called for XI builds.

        (My understanding is there are many files you wouldn't want to do the update on,
        which is why we'd rather just specify which to do rather than doing all w exclusions)
    */
    grunt.task.registerTask(UPDATE_ESSENTIAL_JS_FILES_WITH_CORRECT_PRODUCT_NAME, function() {

        // file you want to replace in : file to map it to (if same will just update curr file w new version)
        var jsFilesToUpdate = {
            "assets/lang/en/jsTStr.js": "assets/lang/en/jsTStrXI.js",
            "assets/lang/zh/jsTStr.js": "assets/lang/zh/jsTStrXI.js",
            "assets/jupyter/ipython/nbextensions/xcalar.js": "assets/jupyter/ipython/nbextensions/xcalar.js",
        }
        var jsFile, jsFileFullSrc, jsFileFullDest;

        // go through each essential file; create new file w/ the updated text and save that
        for ( jsFile of Object.keys(jsFilesToUpdate) ) {
            jsFileFullSrc = DESTDIR + jsFile;
            jsFileFullDest = DESTDIR + jsFilesToUpdate[jsFile];
            updateFileProductName(jsFileFullSrc, jsFileFullDest, !KEEPSRC); // 3rd option allows you to delete original file, if dest =/= src
        }

    });

    /**
        Update src attributes of <script> tags in the bld html,
        to point to minified files that have been generated,
        rather than original unminified srces.
    */
    grunt.task.registerTask(UPDATE_SCRIPT_TAGS, function() {

        // get all the html files in the bld dir
        var htmlBldAbsPath = DESTDIR + htmlMapping.dest;
        //var htmlFilepaths = grunt.file.expand(htmlBldAbsPath + "**/*.html");
        var htmlFilepaths = HTML_BUILD_FILES;

        // update each html file using the js filepath mapping set during configureUglify
        grunt.log.writeln(("\nJS Minification Clean-up section: ").yellow.bold
                + (" For each html file in "
                + htmlBldAbsPath
                + ", update any <script> tags to use new minified filenames").yellow);
        var filepath;
        for ( filepath of htmlFilepaths ) {
            updateJsScriptTags(filepath);
        }
    });

    /**
        Given an absolute path to an html file,
        Update <script> tags in the html file, such that for all <script> tags in the doc,
        if the <script> tag's 'src' attribute appears as a key in the hashmap,
        that 'src' attribute will be updated to the key's value in the hashmap.

        If multiple <script> tags have 'src' that map to the same destination filepath,
        they will be replaced with a single <script> tag having that destination filepath.

        This is to be done after js minification, so you can update to minified filenames

        This will consume a global variable called jsFilepathMapping, which is populated during
        'configureUglify', when js filenames are discovered and their corresponding min filepaths
        are constructed.

        @Example:

        jsFilepathMapping:  // if this is how it was set up in configureUglify

            {
            '/assets/js/dashboard/db.js':'/assets/js/dashboard.min.js',
            '/assets/js/dashboard/db2.js':'/assets/js/dashboard.min.js'
            '/assets/js/utils/util.js':'/assets/js/utils.min.js'
            }

        So in this case, if an html file has the following script tags:

        <script src='/assets/js/dashboard/db.js'>
        <script src='/assets/js/dashboard/db2.js'>
        <script src='/assets/js/utils/util.js'>
        <script src='/assets/js/3rd/a.js'>

        It will have the following script tags after this function:

        <script src='/assets/js/dashboard.min.js'>
        <script src='/assets/js/utils.min.js'>
        <script src='/assets/js/3rd/a.js'>
    */
    function updateJsScriptTags(htmlFilepath) {

        // if rel make abs (need for resolving the rel filepaths in tags)
        var htmlFilepathRelBld, htmlFilepathAbs;
        if ( !grunt.file.isPathAbsolute(htmlFilepath) ) {
            htmlFilepathAbs = DESTDIR + htmlFilepath;
        }
        htmlFilepathRelBld = path.relative(DESTDIR, htmlFilepathAbs);

        grunt.log.debug("Scan " + htmlFilepath + " to find <script> tags for js files that might have been minified");
        var $ = cheerio.load(fs.readFileSync(htmlFilepathAbs, "utf8")); // get a DOM for this file using cheerio
        var mappingFilepaths = {}; // keep track of what 'src' attributes have been update to so far, so no dupes in final
        // retrieve the minification filepath maapping for script tags
        var jsFilepathMapping = grunt.config.get(JS_MINIFICATION_SCRIPT_TAG_FILEPATH_MAPPING_CONFIG_KEY);
        if ( !jsFilepathMapping ) {
            grunt.fail.fatal("The grunt config key "
                + JS_MINIFICATION_SCRIPT_TAG_FILEPATH_MAPPING_CONFIG_KEY
                + " has not been set in grunt config.\n"
                + "This key should hold a mapping of src attrs of js <script> tags in html files,"
                + " and src attr the tags should be converted to after js minification\n"
                + "js minification process has changed!");
        }
        var modified = false;
        var filedir = path.dirname(htmlFilepathAbs); // will need to resolve filepaths so need the files dir
        var src, srcResolved, srcRelBld; 
        grunt.log.write(("\t" + htmlFilepathRelBld + "... ").blue);
        $('script').each(function(i, elem) { // go through each script tag

            src = $(this).attr('src'); // get ' src' attr of current script tag

            if ( src ) { // make sure there was an 'src' attrihbute

                /**
                    entries in jsFilepathMapping are rel bld
                    src attr will be rel. to location of the file...
                    (i.e., if in assets/htmlFiles/walk/somefile.html
        i            script src will be ../../js/myfile.js)
                    so first resolve to abs path, then get rel portion within bld
                */
                srcResolved = path.resolve(filedir, src); // filedir is abs, so would flatten ex above to <pathtobld>/assets/js/myfile.js
                srcRelBld = path.relative(DESTDIR, srcResolved); // --> assets/js/myfile.ejs
                grunt.log.debug("File: " + htmlFilepath + "| script tag Orig: " + src + " | resolved: " + srcResolved + " | rel bld: " + srcRelBld);

                // see if the src is one the filepaths that has a new mapping
                if( jsFilepathMapping.hasOwnProperty(srcRelBld) ) {

                    equivSrcRelBld = jsFilepathMapping[srcRelBld];

                    /**
                         ok it is present.  Now, its dest. already been mapping in a previous script tag?
                        (Ex: if an html file had script tags, one for each js file in a dir.
                        But now all those js files in the dir got minified in to a single file.
                        You want to essentially condense all those in to a single script tag for the mini file
                    */
                    if( mappingFilepaths.hasOwnProperty(equivSrcRelBld) ) {
                        //console.log("\t\t[Remove " + src + " ].... ");
                        // delete this <script tag entirely
                        $(this).remove();
                    }
                    else {
                        // need to undo so rel to same loc.
                        equivSrcResolved = path.relative(filedir, DESTDIR + equivSrcRelBld);
                        grunt.log.debug("\tFound resolved in the hash... update to: " + equivSrcResolved);

                        // update the 'src' attribuate to the new value and add to mappingFilepaths
                        $(this).attr('src', equivSrcResolved);
                        mappingFilepaths[equivSrcRelBld] = true;
                    }
                    modified = true;
                }
            }
        });

        if(modified) {
            grunt.log.debug("DOM was modified... (a script tag was updated in this file)");
            fs.writeFileSync(htmlFilepathAbs, $.html(), {'encoding': 'utf-8'}); // renders the modified dom as html and overwrites file at filepath
            grunt.log.ok();

        }
        else {
            grunt.log.writeln(("(No script tags found to update)").bold);
            grunt.log.debug("DOM was never modified by cheerio ... "
                + " (if any script tags, none of them had a src attr for a js file that was minified)");
        }
    }

    /**
        Dynamically configure the 'uglify' (js minification task).
        - determine which files should be minified, and to what filepaths,
          and create an uglify target for each such desired minified file.
        At the same time, keep track of following:
        - if running script without option to save source,
          also keep tab on which js files are getting mapped, so they
         can be removed after the minification.
    */
    function configureUglify() {

        grunt.log.writeln(("\nJS Minification Set-up section: ").bold + (" Configure grunt's uglify (js minification) task").grey.bold);

        /**
            dictionary to set as 'uglify' plugin configuration
            keys will be uglify 'targets', as the new minified filename.
            Value will be, the target data (just like what you'd have in initConfig with src, dest, cwd attrs)
        */
        var uglifyConfig = {};

        /**
            Hash with key/value as <unminified filepath rel bld>: <minified filepath it will be mapped in to, rel bld>

            Context:
            Once js has been minified, will need to update script tags in HTML files (UPDATE_SCRIPT_TAGS task),
            to swap out 'src' attrs having unminified filepaths, with their corresponding minified filepaths
            So as we're setting up for uglification
            also build up a hash that has <unminified file> --> <corresponding minified file>
            and make this globally accessible in the grunt.config param, so it can be used llater during script tag updating.

            (Keeping own hash rather than relying on uglifyConfig,
            because would have to search through entire    uglify config
            for every single script tag in every single html file!)

            ** THESE KEY VALUES (unminified filenames) ARE EXPECTED TO BE REL BLD
            ** IF THEY AREN'T, UPDATING SCRIPT TAGS WILL FAIL
            --> this because: the final js files, could be nested elsewhere in bl d.
                And when you want to update their script tags, those script tags will be rel. to where that file is
                (i.e., might be ../../../js/somefile.js)
                So in the function that updates script tags, going to normalize all script src attrs, to be path rel bld,
                and that's what we'll check for in this hash
        */
        var jsFilepathMapping = {};

        /** STEP 1: CONFIGURE THE 'uglify' TASK SO THAT GRUNT KNOWS WHAT FILES TO MINIFY ANOD HOW */

        /**

            ORDERING DURING MINIFICATION

            Due to code dependencies, the order files are concatenated together during minification is important.
            (some of the scripts call functions in other scripts, and so when they are imported in the HTML,
            we need those parent functions to be imported first).
            The ordering is set in the script.html file (you can observe this in your workspace);
            other html files get their script tags auto-generated based on the ordering in this script.
            An efficient way to get the ordering, will be to parse an HTML file and traverse the DOM,
            but we can not do this from script.html since it is not an actual html file.
            So instead, use index.html, which is an actual HTML file we can parse using cheerio.
        */

        // step 1: parse approrpiate HTML file to get list of all js script tags
        var filepathForScriptTagParsing = DESTDIR + JS_MINIFICATION_PARSE_FILE;
        //filepathForScriptTagParsing = "/home/jolsen/xcalar-gui/index.html";

        grunt.log.writeln(("\nStep 1:").bold
            + (" Parse <script> tags in " + filepathForScriptTagParsing
            + " to determine which js files should be minified, "
            + "\nand order they should be concatenated together during minification")[STEPCOLOR]);

        var $ = cheerio.load(fs.readFileSync(filepathForScriptTagParsing, "utf8")); // get a DOM for this file using cheerio

        // GO through each script tag, categorize what minified file it should map to
        var scriptTagSrcAttr, srcFilepathAbs, exclude, ignore, minipathRelDivergeAt, minifileBldDest, minifileBldDestAbs;
        var minificationDivergeAt = jsMapping.src;
        var scriptTags = {}; // check for any script tags in script.html being duplicated, is bug will issue warning
        $('script').each(function(i, elem) {

            scriptTagSrcAttr = $(this).attr('src'); // get ' src'

            // some validation
            if ( scriptTagSrcAttr ) {

                // since written to be included in to index.html which is at root of bld,
                // the src attrs should be rel bld root
                srcFilepathAbs = DESTDIR + scriptTagSrcAttr;

                // check 1: check if already found a script tag for this entry (bug in script.html)
                if ( scriptTags.hasOwnProperty(scriptTagSrcAttr) ) {
                    END_OF_BUILD_WARNINGS.push(filepathForScriptTagParsing + " : Duplicate <script> tag w src attr '" + scriptTagSrcAttr + "'");
                    return; // jquery version of 'continue'
                }
                scriptTags[scriptTagSrcAttr] = true;

                // check 2: if its not part of where we want to start minifying from, skip , probably 3 rd party
                if ( !scriptTagSrcAttr.startsWith(minificationDivergeAt) ) {
                    grunt.log.writeln(("\t" + scriptTagSrcAttr + (" not in path we want to minify files in... (probably 3rd party)... skip").bold).blue);
                    return; // jquery version of contionue;
                }

                /**
                    check 3: if you can NOT find script being referenced - continue!!
                    Consider this scenario :
                    The file at that src is a real bld file (rather than http address, etc.),
                    its just not generated until later in the bld process (Ex: config.js)
                    In such case, if you don't skip over here, it's going to get set in the uglify config
                    (1) uglify will run, and that target will fail, (but grunt will continue,
                    and unfortunately no way to remove this entry from the config due to the failure).
                    later on, when cleaning up JS after updating the script tags
                    (2) will remove all src files in the uglify config.
                    So if the file gets generated sometime between (1) and (2), the file
                    will end up getting deleted at (2) since it's still in here, and just didn't get minified
                */
                if ( !grunt.file.exists(srcFilepathAbs) ) {
                    grunt.log.writeln(("\t" + scriptTagSrcAttr + (" Can NOT resolve src path- do NOT put in uglify config!").bold).blue);
                    return;  // 'continue' in jquery...
                }

                // check 4: in one of dirs or files not to minify
                ignore = false;
                for ( exclude of DONT_MINIFY ) {
                    if (
                        scriptTagSrcAttr.startsWith(exclude) ||
                        path.basename(scriptTagSrcAttr) == exclude
                    ) {
                        grunt.log.writeln(("\t" + scriptTagSrcAttr + (" blacklisted from minification... skip...").bold).blue);
                        ignore = true;
                        break;
                    }
                }
                if ( ignore ) { return; }

            }
            else {
                /**
                    if src attr "", then its tag for an actual function in the HTML
                    rather than something being included externally; continue
                    (Keep this check in... That way in case you ever switch
                    divergeAt variable (the path at whiich you want to start)
                    js minification at) to an empty string (start from anywhere )
                    you won't get problems because this would then match..
                */
                grunt.log.writeln((("\tUndefined or empty entry on script tag... ").bold + scriptTagSrcAttr + (" skip: ").bold).blue);
                return; // a loop 'continue' in jquery
            }

            /**
                get minified filename for this file.
                (returns filepath relative to the divergence dir (2nd arg) to function)
                so if you send
                getMinifiedFilepath('/home/jolsen/xcalar-gui/assets/js/A/B/C/e.js', 'assets/js', 2);
                returns 'A/B/C.js'
                if undefined, could not determine a filepath, warn; could indicate bug
            */
            minipathRelDivergeAt = getMinifiedFilepath(scriptTagSrcAttr, minificationDivergeAt, JS_MINIFICATION_CONCAT_DEPTH);
            if (minipathRelDivergeAt == undefined) {
                grunt.log.warn("Could NOT determine minification filepath for file " + scriptTagSrcAttr);
                return;
            }
            minifileBldDest = minificationDivergeAt + minipathRelDivergeAt;
            minifileBldDestAbs = DESTDIR + minifileBldDest;
            // Jerene wants an extra check, that if file and dir having the same name, alert developers..
            // quickest to catch this right now I think, is  if the minifiedFilepath that comes back, is same as an existing file,
            // but the file getting minified is NOT that existing file
            // i.e., if you had assets/js/stuff/A.js minifying in to --> assets/js/stuff.js, and there's also an assets/js/stuff.js regular file
            // but, not a problem if assets/js/stuff.js --> minifies in to itself at assets/js/stuff.js
            if ( grunt.file.exists(minifileBldDestAbs) && minifileBldDestAbs !== srcFilepathAbs ) {
                END_OF_BUILD_WARNINGS.push("File " + srcFilepathAbs + " set to minify in to "
                    + minifileBldDestAbs
                    + ", and a file by this name already exists.  But, it is NOT "
                    + " this file getting minified!"
                    + "\nMost likely, you have a file and dir in the js portion of the bld, by the same name."
                    + "\n(Doesn't mean the bld will fail, if this is the case but all are represented in script.html,"
                    + " they will all get minified in to the same file.  If there is a problem bld should fail."
                    + "\nHowever, this naming convention is not ideal; please address it");
            }

            /**
                Store in the config dictionary for the 'uglify' multi-task
                Make each minified file an individual target for the task

                target should look like this (the ex. in grunt-contrb-uglify's main documentation  follows a different documetation,
                but this is the official grunt syntax, and pattern using in rest of this script

                <target name> : {
                                    'dest': <path to destination minified file>,
                                    'src': [<js1Path>, <js2Path>, ..], // list of filepaths for files to be concatenated together in final minified js
                                    'options': {}, // any special options you might like. not using anyo currently
                                },
            */

            grunt.log.writeln(("\t" + scriptTagSrcAttr + (" --> will minify INTO ")['red'] + minifileBldDest));
            // if first instance of this minified filepath encoutnered, initialize the new target - i.e.,. a key in the config hash
            // store by the minipath, not filename, in case two same
            // i.e., A/B/C.js and A/D/C.js
            if( !uglifyConfig.hasOwnProperty(minipathRelDivergeAt) ) {
                uglifyConfig[minipathRelDivergeAt] = {'src':[], 'dest':minifileBldDestAbs, 'options':{}};
            }
            uglifyConfig[minipathRelDivergeAt].src.push(srcFilepathAbs); // add in as src for proper target

            // add to the jsFilepathMapping hash for updating script tags later in bld process.
            // THESE NEED TO BE REL BLD!
            jsFilepathMapping[scriptTagSrcAttr] = minifileBldDest;
        });

        /**
            == Check for bug-inducing naming collisions before you queue minification! ==

            Example...
            Suppose js dir like this
            assets/js/stuff.js  (this file does not appear in script.html!)
            assets/js/stuff/A.js --> minified in to stuff.js
            assets/js/stuff/B.js --> minified in to stuff.js
            assets/js/C.js --> minified in to C.js

            What would happen in this case, is A.js and B.js would get concatenated
            and minified in to assets/js/stuff.js, overwriting that current, unminified file.
            And since assets/js/stuff.js (unminified) not in script.html,
            its not getting minified itself and gets lost.

            -- Since we are using the same extensions, can't just check for file
            existence before writing a new minified file, because it's expected and
            desired to overwrite current files (Ex, assets/js/C.js unminified, should
            be minified and overwrite)

            So instead --> for each new minified filepath
                ('dest' attr of key/target in uglifyConfig)
            Check if that path exists already
            If it does,
            Check to make sure that unminified file is ALSO getting minified
            (its path rel bld would be a key in jsFilepathMapping then)
            If its NOT, that means it is going to be being overwritten and not minified itself
            (Need to do this after you've built up both hashes, not during, because one
            could came after the other)
        */
        var newmini, unminirelbld;
        for ( newmini of Object.keys(uglifyConfig) ) {
            // keys/targets in the uglifyConfig are just filenames, hash value has 'dest' attr that holds abs path
            newmini = uglifyConfig[newmini].dest;
            // check if files exists
            if ( grunt.file.exists(newmini) ) {
                // could be just overwriting no problem... just make su re file that exists is getting minified too
                unminirelbld = path.relative(DESTDIR, newmini);
                if ( !jsFilepathMapping.hasOwnProperty(unminirelbld) ) {
                    grunt.fail.fatal("Grunt is set to create a minified file at path"
                        + newmini
                        + "\nHowever, a file by this name already exists,"
                        + " and that file is not itself set to be minified in to another file"
                        + " -- it would just get overwritten!"
                        + "\nMost likely, you have a file and dir by the same name,"
                        + " and only one of those is appearing in 'script.html'"
                        + "\n\n-- One solution, is if you want to minified ALL the js files in the project,"
                        + "not just the ones appearing in script.html. (This requires change in Grunt code)"
                        + "\n\n-- Quicker solution: rename the file/dir to avoid this naming collision"
                        + " (This resolves the problem without changing any Grunt code)");
                }
            }
        }

        // everythings kosher... configure uglify task with these details
        grunt.log.write(("\nStep 2: ").bold + (" Configure grunt's uglify task with gathered mapping... ")[STEPCOLOR]);
        grunt.config('uglify', uglifyConfig);
        grunt.log.ok();
        // set the jsFilepathMapping hash for updating script tags, in to grunt config property, for access in other tasks
        grunt.config(JS_MINIFICATION_SCRIPT_TAG_FILEPATH_MAPPING_CONFIG_KEY, jsFilepathMapping);

    }

                                                                // -------------- MISC. BUILD TASKS -----------------//

    /**
        Searches build directory for files containing 'xcalar design' Strings (minus exclusions)
        and warns user of such files.

        Context: In XI producat builds, GUI should display 'xcalar insight' rather than 'xcalar design'.
        Such Strings should be limited to some central js files, rather than hardcoded throughout
        rest of code, so they are not being manually changed during build time.
        This task is provided then as a check to be used for XI builds, once build is complete,
        to help detect if this style has been violated and alert of potential bug.
    */
    grunt.task.registerTask(CHECK_FOR_XD_STRINGS, function() {

        // grep the entire dest dir for any occurances of 'xcalar design', excluding some dirs and files specified here

        var grepCmd = "grep -r -I -i -l 'xcalar design'"; // returns filepaths w/ occurances of xcalar design (case insensitive); recursive, ignores binary files
        var excludeDirs = ['ext-unused', 'bin']; // exclude any files with paths that contain any of these dirs
        var excludeFiles = ["htmlTStr.js", "CopyrightAndTrademarks.htm", "README"]; // exclude any files with these names.  Sorry, isn't working with abs. filepaths yet
        var excludeDir, excludeFile;
        var shellStr;
        var grepCmdOutput;
        var matchingFile;
        var currCwd = process.cwd();

        // build up the full grep cmd, mindful of exclusions metniond
        for ( excludeDir of excludeDirs ) {
            grepCmd = grepCmd + " --exclude-dir " + excludeDir;
        }
        for ( excludeFile of excludeFiles ) {
            grepCmd = grepCmd + " --exclude " + excludeFile;
        }
        grunt.log.write("Checking for relevant files with XD strings using grep cmd:\n\t" + grepCmd + "\n... ");

        grunt.file.setBase(DESTDIR); // switches grunt to the bld output
        shellStr = shell.exec(grepCmd, {silent:true}); // runs the cmd; shellJs runs cmds syncronously by default
        grepCmdOutput = shellStr.stdout; // cmd output
        grunt.file.setBase(currCwd); //  switch back before continuing

        // if there were any results, warn the user
        if (  grepCmdOutput ) {
            grunt.log.warn(("WARNING: There are still files within your build, "
                + "which have some form of 'xcalar design', though this is an XI build."
                + "\n Files: (from within "
                + DESTDIR
                + ")\n").red.bold
                + grepCmdOutput
                + "\n** (If these files are expected to have xcalar design strings, "
                + " and you want to suppress this warning on future builds: "
                + "\nedit Gruntfile, and add files and/or dirs to ignore in function CHECK_FOR_XD_STRINGS)\n**");
        }
        else {
            grunt.log.ok();
            grunt.log.writeln("Did not detect any relevant files in the build with product strings that need to be updated!");
        }
    });

    /**
        This task performs final cleanup/summary tasks common to all build flavors,
        to be executed once build is complete.

        1. Change permissions to 777 for entire bld
        2. Clean out final bld of any empty dirs
        3. Print a bld summary
    */
    grunt.task.registerTask(FINALIZE, function() {

        /**
            danger:
            IF SRCROOT is same as DESTDIR
            (this  is default behavior for dev blds)
            Then changing permissions, doing the cleanempty on the final bld,
            you'll end up altering the project src itself.
            Skip all of these tasks, including the CHECK_FOR_XD_STRINGS.
            (Because there will be valid files with XD in them since its proj src)
            But do display summary...
        */

        if ( SRCROOT == DESTDIR ) {
            grunt.log.warn("Output directory for build output is same"
                + " as project source."
                + "\nWill bypass the final cleanup steps normally done on the final build product,"
                + " such as cleaning empty bld dirs, changing permissions, "
                + " and checking for XD strings if this is an XI bld)");
        }
        else {

            // didn't want to clean html until very end,
            // in case you do js minification, because it needs
            // html src file.  so do that clean now.
            if ( !KEEPSRC ) {
                grunt.task.run(CLEAN_BUILD_SECTIONS);
            }

            // clean out any empty dirs in the bld, recursively.
            // this is time consuming - do not do it for individual watch tassks
            if ( !IS_WATCH_TASK ) {
                grunt.task.run('cleanempty:finalBuild');
            }

            if ( PRODUCT != XD ) {
                grunt.task.run(CHECK_FOR_XD_STRINGS);
            }

            grunt.task.run('chmod:finalBuild');
        }

        /**
             display summary will dislay info about bld
            we don't want to do this if its a watch task
            because it will end up displaying a tthe end of
            every watch event.
            (dont rely on if its a bld task, rather make sure
            its NOT a watch task, because you
            can run watch and a build task simultaneously)
        */
        if ( !IS_WATCH_TASK ) {
            grunt.task.run(DISPLAY_SUMMARY);
        }

    });

    /**
        create an empty config file,
        overwriting existing one, if any
    */
    grunt.task.registerTask(NEW_CONFIG_FILE, "Reset the config file to be clear of any developer details", function() {

        // will create an empty config file, overwriting whatever might be there
        grunt.log.writeln("======= clear developer's config file ======");

        generateNewConfigFile(); // will create an empty config file
        grunt.log.ok();

    });

    /**
        displays a useful summary at the end of the build process.
    */
    grunt.task.registerTask(DISPLAY_SUMMARY, 'Display summar of the build process for the end user', function() {

        /**
            here are some valid colors you can use with grunt log API (at time of writing this):
            'white', 'black', 'grey', 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow', 'rainbow'

            syntax (since this is not in the grunt documentation...),
            [note quote marks]

            grunt.log.write(("your stuff").cyan); // will color entire line as cyan
            grunt.log.write(("your stuff " + VARA)["cyan"]["bold"] + " more stuff"["red"]); // formatting indiovidual pieces
            grunt.log.write(("stuff").cyan.bold); // bolds and colors entire line cyan
        */

        var dirColor = 'yellow',
            olColor  = 'rainbow',
            txColor = 'green',
            bottomKeyColor = "green";

        // main bld summary
        grunt.log.writeln(("\n=============================================="[olColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("|"[olColor] + "  BUILD SUMMARY:"[txColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("|"[olColor]['bold'] +  " Build   type: " + BLDTYPE[txColor]));
        grunt.log.writeln(("|"[olColor]['bold'] +  " Product type: " + PRODUCTNAME[txColor]));
        grunt.log.writeln(("|"[olColor].bold));
        grunt.log.writeln(("|"[olColor]['bold'] +  " Src root:"[txColor]));
        grunt.log.writeln(("|\t"[olColor] + SRCROOT[dirColor]).bold);
        grunt.log.writeln(("|"[olColor]['bold'] + " Top-level Bld root:"[txColor]));
        grunt.log.writeln(("|\t"[olColor]['bold'] + BLDROOT[dirColor]['bold']));
        grunt.log.writeln(("|"[olColor]['bold'] + " Bld root:"[txColor]));
        grunt.log.writeln(("|\t"[olColor] + DESTDIR[dirColor]).bold);
        grunt.log.writeln(("|"[olColor]).bold);
        grunt.log.writeln(("==============================================="[olColor]).bold);

        /** for purpose of debugging this grunt file */

        // print out filepaths of some of the files auto-generated duoring bld
        fancyLine();
        grunt.log.debug(("\n Some files/dirs generated during this bld, and their locations:").bold);
        var generatedItem;
        for ( generatedItem of Object.keys(generatedDuringBuild) ) {
            grunt.log.debug("\n [" + (generatedItem)[bottomKeyColor] + "]");
            grunt.log.debug("\n\t" + generatedDuringBuild[generatedItem]);
        }
        fancyLine();

        // display any of the potential bugs migyht have found
        var i = 0;
        for ( i = 0; i < END_OF_BUILD_WARNINGS.length; i++ ) {
            //grunt.log.write("Found issue #" + i + ": ");
            //grunt.log.writeln((END_OF_BUILD_WARNINGS[i]).bold.red);
        }

    });

    function fancyLine() {
        var plCl = "blue",
            minCl = "white",
            pattern = ("+"[plCl] + "-"[minCl]),
            numPatternsToPrint = 50,
            i = 0;

        grunt.log.writeln("");
        for ( i = 0; i < numPatternsToPrint; i++ ) {
            grunt.log.write(pattern);
        }
        grunt.log.writeln("");
    }

    /**
        FOR TRUNK BLDS ONLY:

        Takes a developer backend workspace, and transfers their local thrift files to the build,
        then configures build to allow communication between front and backend so those changes
        will be reflected.
        This will occur as a last task in the TRUNK build process.
    */
    grunt.task.registerTask(SYNC_WITH_THRIFT, "Sync trunk with thrift so backend and front end can communicate", function() {

        grunt.log.writeln("===== sync with trhfit ========");

        var backendSrcAbsPath = BACKENDBLDDIR + BACKEND_JS_SRC,
            thriftDestAbsPath = DESTDIR + GUIPROJ_THRIFT_DEST, // ok if doesn't exist yet; copy will create it
            tmpDirFullPath = DESTDIR + "tmpJsHolderThrift/";

        if ( !grunt.file.exists(backendSrcAbsPath) ) {
            grunt.fail.fatal("Trying to copy backend xcalar scripts in to GUI project as part of thrift bld"
                + ", but can not access backend source of those scripts:\n"
                + backendSrcAbsPath
                + "\n(If you want to use a different src dir for your thrift changes other than "
                + BACKENDBLDDIR
                + "\nthen re-run Grunt with option: "
                + " --" + BLD_OP_BACKEND_SRC_REPO + "=<your proj root> )");
        }
        if ( !grunt.file.exists(thriftDestAbsPath) ) {
            grunt.log.warn("Directory in bld to hold thrift files from backend: "
                + GUIPROJ_THRIFT_DEST
                + " does not exist within the build directory.");
        }

        /*
             js files from the backend will replace build files
            there are some build files you'd like to keep though.
            save the build files you want to keep in to a temp dir

            (the files to keep - rel the dir to copy the thrift scripts in to -
            are keys of a global hash.
            Each copy operation, store the tmp location of the file as the key's value,
            then in last step will collect them at these values and copy in to their
            final location)
        */
        grunt.log.writeln(("\n1. Set aside build files you want to retain").cyan);
        var saveScriptRelFilepath,
            saveScriptAbsFilepath,
            saveScriptTmpFilepath;
        for ( saveScriptRelFilepath of Object.keys(KEEP_FRONTEND_SCRIPTS) ) { // they are FILEPATHS relative to the bld dest dir
            saveScriptAbsFilepath = thriftDestAbsPath + saveScriptRelFilepath;
            saveScriptTmpFilepath = tmpDirFullPath + saveScriptRelFilepath;
            grunt.log.writeln("cp " + saveScriptAbsFilepath + " --> " + saveScriptTmpFilepath);
            grunt.file.copy(saveScriptAbsFilepath, saveScriptTmpFilepath); // grunt.file.copy will create intermediate dirs for you, so first copy will create the temp dir
            KEEP_FRONTEND_SCRIPTS[saveScriptRelFilepath] = saveScriptTmpFilepath;
        }
        grunt.log.ok();

        // clear build thrift folder, so dev backend thrift files can be copied in
        grunt.log.writeln(("\n2. Clear GUI build files from " + thriftDestAbsPath).cyan);
        if ( grunt.file.exists(thriftDestAbsPath) ) {
            grunt.log.writeln("Delete dir " + thriftDestAbsPath);
            grunt.file.delete(thriftDestAbsPath, {force:FORCE_DELETE_DANGEROUS});
        }
        grunt.log.ok();

        /** copy in the thrft files from the developers workspace

            Will get the list of files to copy using grunt.file.expand, expanding on the backend dir,
            and copy each in using grunt.file.copy
            however, grunt.file.expand using globbing returns abs filepaths - not paths relative to the dir you're expanding.
            and grunt.file.copy will use abs. paths on src and target.
            Since want to retain dir structure of these backend files,
            then for each filepath in grunt.file.expand, want the portion of the path rel. to the backend dir expanded on
        */
        var backendFilepaths = grunt.file.expand(backendSrcAbsPath + "**/*.js"); // gets filepaths of all .js files in the dir arg and any subdirs of arg
        var absFilepath,
            filepathRelScriptSrc,
            target;
        grunt.log.writeln(("\n3. Copy backend thrift files in to build (all js files nested beginning @ " + backendSrcAbsPath + ")").cyan);
        for ( absFilepath of backendFilepaths ) {
            filepathRelScriptSrc = path.relative(backendSrcAbsPath, absFilepath);
            target = thriftDestAbsPath + filepathRelScriptSrc;
            grunt.log.writeln("cp " + absFilepath + " ---> " + target);
            grunt.file.copy(absFilepath, target);
        }
        grunt.log.ok();

        /**
            copy back in the build files you wanted to save
            (iterating through the array instead of expand on the tmp dir,
            in case one of the copies didn't work, or something has changed,
            then this will fail, which I want to happen);
        */
        grunt.log.writeln(("\n4. Port back in the bld files you saved").cyan);
        for ( saveScriptRelFilepath of Object.keys(KEEP_FRONTEND_SCRIPTS) ) {
            // tmp location it should be at, is val of this key
            saveScriptTmpFilepath = KEEP_FRONTEND_SCRIPTS[saveScriptRelFilepath];
            target = thriftDestAbsPath + saveScriptRelFilepath;
            grunt.log.writeln("cp " + saveScriptTmpFilepath + " ---> " + target);
            grunt.file.copy(saveScriptTmpFilepath, target);
        }
        grunt.log.ok();

        // delete the tmp folder used, from the bld
        grunt.log.writeln("Delete the tmp folder: " + tmpDirFullPath);
        grunt.file.delete(tmpDirFullPath, {force:FORCE_DELETE_DANGEROUS});
        grunt.log.ok();

        /**
            create a 'prod' folder in GUI src root, symlinked to the build
            (backend uses apache; it's configured to look for the gui build in a 'prod' folder of the gui project root)

            Check first if DESTDIR already this name, because if so you don't need the symlink.
            If DESTDIR isn't named by this but there is a dir in the src root by this name, fail out (change later if needed)
            However, if you are generating trunk builds repeatedly with this gui src, then you will want to overwrite with a new symlink each time.
        */
        grunt.log.writeln(("\n5. Create sym link to the gui bld called " + THRIFT_APACHE_GUI_PATH + ", so backend Apache can access frontend GUI project").cyan);
        var thriftApacheFullPathToLookForGuiBld = SRCROOT + THRIFT_APACHE_GUI_PATH;
        // if destdir already is the path apache looking for, you do not need to do this
        if ( DESTDIR == thriftApacheFullPathToLookForGuiBld ) {
            grunt.log.writeln("The destination dir for the build is already named '"
                + THRIFT_APACHE_GUI_PATH
                + "\nThere is no need to create the symlink; apache can already find the GUI project");
        }
        else {
            /**
                 check if already a valid path.
                if symlink, assume from a previous bld; overwrite it,
                else fail out so we don't delete something
                !!GRUNT's file.exists (and fs.exists) return FALSE on dangling symlinks!!!
                (link to dir that no longer exists... )
                and grunt.file.delete will fail to delete dangling symlinks
                Therefore,i test for symlink using lstatSync, and delete using shell cmd if exists
                (will work on dangling symlinks)
            */
            var statObj, shellCmd;
            try {
                statObj = fs.lstatSync(thriftApacheFullPathToLookForGuiBld);
                // check if a symlink
                if ( statObj.isSymbolicLink() ) {
                    grunt.log.write("Delete existing symlink (probably from previous bld) @ "
                        + thriftApacheFullPathToLookForGuiBld + " ... ");
                    shellCmd = 'rm ' + thriftApacheFullPathToLookForGuiBld; // its an abs path
                    shell.exec(shellCmd); // runs the cmd; shellJs runs cmds syncronously by default
                    grunt.log.ok();
                }
                else {
                    grunt.fail.fatal("This is a TRUNK build, intended for backend development.\n"
                        + "Apache on the backend, is configured to look for gui build within GUI src root,"
                        + " @ folder called : '"
                        + THRIFT_APACHE_GUI_PATH
                        + "'\ntherefore, need to create a symlink to this build, within the GUI src root, "
                        + " set to that name."
                        + "\nHowever, that desired path, "
                        + thriftApacheFullPathToLookForGuiBld
                        + ", already exists,\nand it is not a symlink from a past build,\n"
                        + " nor is it that the build dest dir itself is called "
                        + THRIFT_APACHE_GUI_PATH
                        + "\n Will NOT override.");
                }
            }
            catch (err) {
                // its ok if ENOENT file not existing error
                if ( err.code != 'ENOENT' ) {
                    throw err;
                }
            }

            grunt.log.write("Set new sym link " + thriftApacheFullPathToLookForGuiBld + " --> " + DESTDIR + " ... ");
            fs.symlinkSync(DESTDIR, thriftApacheFullPathToLookForGuiBld);
            grunt.log.ok();
        }

        /**
            generate a config file with local machine details.
            This will define these properties and allow for the communicatino between the front and backend.
        */
        hostname = os.hostname();
        contents = "var hostname='http://" + hostname + ":9090'; var expHost='http://" + hostname + ":12124';";
        grunt.log.writeln(("\n6. Create a config file with developer's local details: "
            + contents
            + "\nto allow the communication between back and front end").cyan);
        generateNewConfigFile(contents);
        grunt.log.ok();

    });

    /**
        Create a new config file within the build.
        If a config file already exiists, will overwrite it.

        @contents: optional String - contents to write to file.  (For trunk blds you will want to give some initial data).
        If you don't specify anything a blank file will get created.
    */
    function generateNewConfigFile(contents) {

        configFileAbsFilepath = DESTDIR + CONFIG_FILE_PATH_REL_BLD;
        grunt.log.write("\nCreate new config file (overwrite if exists) @:\n\t" + configFileAbsFilepath + "\n.... ");
        grunt.file.write(configFileAbsFilepath, contents); // will create the file and any intermediary dirs needed
        grunt.log.ok();

        generatedDuringBuild["Bld Config File"] = configFileAbsFilepath;

        //grunt.fail.fatal("made config; exit!@");

    }

    /**
        given a String (should be a 'xcalar design' string)
        return appropriate 'xcalar insight' string
        3 cases, depending on how letters in arg String are cased

            'xcalar design' --> 'xcalar insight'
            'xcalar Design' --> 'xcalair Insight'
            'xcalar DESIGN' --> 'xcalar INSIGHT'

        (*case of letters in 'xcalar' does not matter)
    */
    function convertXDstrToXIstr(xdStr) {

        // make sure this is an xcalar design string
        xcalarDesignName = 'xcalar design';
        if ( xdStr.toLowerCase() != xcalarDesignName ) {
            grunt.fail.fatal("Trying to convert a Xcalar Design string to a Xcalar Insight string, "
                + " but String is not in expected format.\n"
                + "String: " + xdStr
                + "\nXcalar design name expected: " + xcalarDesignName
                + "\n(has xcalar design name changed? "
                + " Or, if you see padded ws that could be why and would be a bug in this script)");
        }

        var xcalarPart = xdStr.substring(0, "xcalar ".length);
        var designPart = xdStr.substring("xcalar ".length);

        if (designPart[0] === "d") {
            // All small
            return xcalarPart + "insight";
        } else if (designPart[1] === "e") {
            // Title case
            return xcalarPart + "Insight";
        } else {
            // All caps
            return xcalarPart + "INSIGHT";
        }

    }

    /**
        Return String of project build number
    */
    function getBuildNumber() {
        /**
            Project build number comes from env variable $BUILD_NUMBER
            $BUILD_NUMBER is an env variable that gets set and exported when the backend is getting packaged,
            which will end up invoking the front end.  So if you are just building the front end standalone
            you will not have this env variable .  in that case just give some default value.
        */
        var buildNumber = "N/A (dev bld)"; // def value in case no env variable available
        var envValue = process.env.BUILD_NUMBER;
        if ( envValue ) {
            buildNumber = envValue;
        }
        return buildNumber;
    }

    /**
        Check if either the src root of the project is descendent of bld,
        or vice versa.
        If neither scenario, return false.
        Else, return the anscestor
    */
    function isSrcOrBldDescendentOfEachother() {
        if ( grunt.file.doesPathContain(SRCROOT, filepath) ) {
            return SRCROOT;
        }
        if ( grunt.file.doesPathContain(DESTDIR, filepath) ) {
            return DESTDIR;
        }
        return false;
    }

    /**
        given an abs. filepath, return portion of filepath rel to src or bld.
        To be used in situation where you know you have an abs. filepath,
        but don't know if it is abs. within the project src or the build,
        but it doesn't matter much; you only need the rel portion
        (this happens during watch tasks, you only get the abs. path to
        a file that was changed, but no way to know befeore hand if it's
        a src or bld file user changed, you don't care only need to know this part)
    */
    function getFilepathRelSrcOrBld(filepath) {

        if ( grunt.file.isPathAbsolute(filepath) ) {
            if ( grunt.file.doesPathContain(SRCROOT, filepath) ) {
                return path.relative(SRCROOT, filepath);
            }
            else if ( grunt.file.doesPathContain(DESTDIR, filepath) ) {
                return path.relative(DESTDIR, filepath);
            }
            else {
                grunt.fail.fatal("I can not determine if file at : "
                    + filepath
                    + " is one of the main html files,"
                    + " because it is not a descendent of the src or the bld directory");
            }
        }
        else {
            grunt.fail.fatal("Not an absolute filepath!  Can not determine poration of "
                + filepath
                + " is rel. to src or bld");
        }
    }

    /**
        Return a String of truncated git sha of most recent project commit of the SRC ROOT.
    */
    function getGitSha() {

        // run the git cmd from the src root; switch back to current cwd before returning

        var gitShaCmd = "git log --pretty=oneline --abbrev-commit -1 | cut -d' ' -f1"; // gets truncated git sha of most rec. commit
        var shellStr;
        var gitShaOutput;
        var currCwd = process.cwd();

        //grunt.file.setBase(DESTDIR);
        grunt.file.setBase(SRCROOT); // switches grunt working dir to SRCROOT
        shellStr = shell.exec(gitShaCmd, {silent:true}); // runs the cmd; shellJs runs cmds syncronously by default
        gitShaOutput = shellStr.stdout.trim(); // cmd output (trim off newline at end - else will mess up in file its getting included in to)
        grunt.file.setBase(currCwd); //  switch back before returning
        return gitShaOutput;
    }

    /**
        given a <filepath> to a js file, a <dir> within that <filepath>
        at which you'd want to start minifying within, and a <depth>
        you want to minification to extend to,
        return a filepath (rel. to <dir>) of a minified file if should map in to in the final bld
        (minification doesn't occur here; only determining the filepath.
        Intended use: you can go through all regular js files in the bld,
        and call this method, and configure that mapping in to to grunt's uglify plugin.
        Then all the files which return a same value from this function,
        would get concatted together by uglify and minified in to that file)

        i.e.,
            <filepath>: '/home/jolsen/xcalar-gui/assets/js/A/B/C/D.js'
            <dir>: '/assets/js/', <depth>: 2,
            returns: 'A/B.js'

        If not js file or name can't be determined, returns undefined

        @args:

        @scriptPath: (required): Path to script to find minification filepath of
            It does NOT need to be abs or rel, but should have the 'divergeAt' in its path
        @divergeAt: (optional, defaults to a global default value set at top of script)
            dir you want to start minifying from
            (set name assuming that you would minify all js starting at,
            AND contained within this dir)
            -- It does not need to match beginning of path, but just some occurance.
            (ex.:, if filepath is /A/B/C/D/, and divergeAt is B/C/, that is fine.
            -- If appears more than once in the path,
            will consider first occurance.
            Ex: /E/R/A/B/C/D/A/B/E, if divergeAt supplied as /A/B,
            will start depth count beginning at dir /A/B.
            If you instead wanted to start at that second occurance,
            then you'd want to supply A/B/C/D/A/B (or /R/A/B/C/D/A/B/, etc.)
        @concatenateStartDepth (int value n >= 0.  Optional, defaults to a global def at top of script)
            The depth, beginning from @divergeAt, at which file concatenation in to
            a single minified js file would begin.
            (Explaination: for brevity, call this arg 'd', and the divergeAt dir as 'START'.
            For each <dir> nested EXACTLY d levels down from START,
            any js files descendent of <dir> would return filename:
                 <path from 'd' to <dir>>/<dir>.<minify fileextension>
            Alternatively, any js file, <file>.js, contained in a <dir> which is < d levels from START,
               would return path <path from d do <dir>>/<file>.<minify fileextension>

        @examples:
            Ex1. getMinifiedFilepath('/home/jolsen/xcalar-gui/assets/js/A/B/C/e.js', '/assets/js', 2)
                RETURNS: 'A/B.min.js'
            Ex2. getMinifiedFilepath('/home/jolsen/assets/js/h.js', '/assets/js/', 2);
                RETURNS: 'h.min.js'
            Ex3. getMinifiedFilepath('/home/jolsen/assets/js/A/B/r.js', '/assets/js/', 2);
                RETURNS: 'A/B.min.js'
            Ex4. getMinifiedFilepath('/home/jolsen/assets/js/A/B/C/e.js', '/assets/js', 3);
                RETURNS: 'A/B/C.js'
            Ex4. getMinifiedFilepath('/home/jolsen/assets/js/A/B/C/e.js', '/assets/js', 0);
                RETURNS: 'js.js'
            Ex5. getMinifiedFilepath('/home/jolsen/assets/js/A/B/E.js', '/home/jolsen/assets/, 1);
                RETURNS: '/home/jolsen/assets/js.js'
            Ex6. getMinifiedFilepath('/home/jolsen/assets/js/A/B/E.js', '/home/jolsen/assets/, 0);
                RETURNS: '/home/jolsen/assets.js'

        (Reason doing it like this... because it seems a bit convoluted...
        This function existing so that we can parse <script> tags in html files,
        and for those 'src' attributes (js files in the bld), dfetermine what
        minified file the that file should get concatenated in to.
        The 'src' attributes, are rel. the build root, and so contain the
        <js bld root> in their path - currently, which is /assets/js/.
        1. Only want to minify  such files.  So having the @divergeAt gives a way to
            check that this is one of the files we'd want to minify.
        2. Currently we are minifying so that files at <js bld root> get minified individually,
        and dirs in <js bld root>, all the contents of the dirs get concatenated together
        and minified in to a single file.  (A depth of 1)
        But in fuiture, want to change it so everything gets minified in to a single file.
        So having depth, means we can change this easily (just switchii to a depth of 0)

    */
    function getMinifiedFilepath(scriptPath, divergeAt, concatDepth) {

        var divergedScriptPath, divergeAfterDirs, depthCount, currDir, bldPath, filestep;
        /** note : using the 'path' methods in this function (join, basename, etc.)
            avoids having to consider case of if a path ends/begins with path separator or not.
            Also, using path.sep so operations are OS agnostic */

        grunt.log.debug(">> File: " + scriptPath
            + ", get minified filepath from "
            + divergeAt
            + ", depth " + concatDepth);

        if ( typeof divergeAt == 'undefined' ) {
            divergeAt = JS_MINIFICATION_DIV_DIR;
        }
        if ( typeof concatDepth == 'undefined' ) {
            concatDepth = JS_MINIFICATION_CONCAT_DEPTH;
        }

        // validate
        if ( concatDepth < 0 ) {
            grunt.fail.fatal("Can not pass a concatenation depth < 0 to getMinifiedFilepath!");
        }

        // make sure this a javascript file
        if ( path.extname(scriptPath) != '.js' ) {
            grunt.log.warn("This is NOT a javascript file!  Can not get a minification name for it!");
            return undefined;
        }

        /**
            special case of depth starting at 0.

            If 0, concatenation should begin exactly in the dir to start
            minification in (divergeAt argument)
            Since no filename or dir to base on, pick a special name these should map to
        */
        if ( concatDepth == 0 ) {
            grunt.log.debug("Special case of depth 0");
            return 'xlrjs' + MINIFY_FILE_EXT;
        }

        // split on the divergence directory where you want minification to begin; return undefined if don't find it in the path
        divergedScriptPath = scriptPath.split(divergeAt);
        if (divergedScriptPath.length == 1) { // (even if String begins with delim, will return 2 elemenets, first being "")
            grunt.log.warn("can't determine minified filename for " + scriptPath+ "; doesn't come from diverance path");
            return undefined;
        }
        divergeAfterDirs = divergedScriptPath[1].split(path.sep); // /assets/js/ would go to --> ['','assets', 'js','']

        /**
            2 cases:
                a. file exists in dir at or deeper than where concatenation begins
                    (i.e., '/assets/js/A/B/C.js', divergeAt '/assets/js/', depth 1)
                b. file exists in dir more shallow than where concatenation begins
                    (i.e., '/assets/js/A/B/C.js', divergeAt '/assets/js/', depth 4)

                Starting from front of path, collect n path elements where n is the concatDepth
                (i.e., '/assets/js/A/B/C/D.js', depth of 3, take pieces 'assets', 'js', 'A')
                Whatever is last piece collected is basename for the new minifile.
                If its a dir, just add the minifile extension on it.
                If its a file, strip off the files current file extension and replace with the minified one.
        */
        depthCount = 0;
        currDir = '';
        bldPath = [];
        // want to take off front elements; reverse + pop instead of shifting (shift slower; iterates entire array)
        divergeAfterDirs.reverse();
        while ( divergeAfterDirs.length > 0 && depthCount < concatDepth ) {
            // if any of the dirs had multiple path seps , i.e., //, will give '' elements for those, so keep going until you hit actual dir.
            do {
                currDir = divergeAfterDirs.pop();
            }
            while ( !currDir );
            // made it to next dir; collect it
            bldPath.push(currDir);
            depthCount++;
        }

        // you got all the pieces!  if last piece is a dir itself, add extension direct ly on.
        // If concatDepth exceeded actual depth of the file, last piece should be the file.
        //  Need to strip off current file extension and add the minified one.
        filestep = bldPath[bldPath.length-1];
        if ( grunt.file.isDir(filestep) ) {
            filestep = filestep + MINIFY_FILE_EXT;
        }
        else {
            filestep = path.basename(filestep, path.extname(filestep)) + MINIFY_FILE_EXT;
        }
        bldPath[bldPath.length-1] = filestep;

        return bldPath.join(path.sep);
    }

    /**
        Given an abs. path to a file, return true or false if the file is
        a src file, mindful of situation where src and bld could be descendents of
        each other.
        (Example: if build out directory is descendent of src root, and this file is nested in
        the build out directory, then even though it is also nested wtihin src root, the
        function will return false as it is a build file, NOT a src file
    */
    function isSrcFile(filepath) {
        if ( !grunt.file.isPathAbsolute(filepath) ) {
            grunt.fail.fatal("Can not determine if src file because path is not abs.  Path: " + filepath);
        }
        // see if descendent of src or bld
        src = false;
        bld = false;
        if ( grunt.file.doesPathContain(SRCROOT, filepath) ) {
            src = true;
        }
        if ( grunt.file.doesPathContain(DESTDIR, filepath) ) {
            bld = true;
        }
        /**
            if descendent of both, SRC and DEST have a common ancestor.
            see which is nested further down - that is what type of file it is
        */
        if ( src && bld ) {
            if ( grunt.file.doesPathContain(SRCROOT, DESTDIR) ) {
                src = false;
            }
            else if ( !grunt.file.doesPathContain(DESTDIR, SRCROOT) ) {
                grunt.fail.fatal("File "
                    + filepath
                    + " is descendent of both bld and src directory, "
                    + "but can't determine if src: "
                    + SRCROOT
                    + " or bld: "
                    + DESTDIR
                    + " is nested further down");
            }
        }
        return src;
    }

    /**
        Given a filepath, update the file so that occurances of 'xcalar design'
        are replaced with 'xcalar insight'
        (see method convertXDstrToXIstr for exact cases)

        @filepath : abs. path to the file
        @destination: (optional, String) - if you want to save the file to a new location
        @deleteOriginal: (optiona, String, defaults to false) - if you want to delete the old file,
            in the case you're saving to a new location
    */
    function updateFileProductName(filepath, destination, deleteOriginal) {

        if ( typeof deleteOriginal == 'undefined' ) {
            deleteOriginal = true;
        }

        var contents;
        var updatedContents;
        var dest = destination;
        if ( !dest ) {
            dest = filepath;
        }

        // if the file exists, read it
        if ( grunt.file.exists(filepath) ) {
            contents = grunt.file.read(filepath);
            updatedContents = updateStringProductName(contents);
            // write the file to the proper destination
            grunt.log.write("Writing/updating file with 'xcalar insight' product Strings, @ " + destination + "... ");
            grunt.file.write(destination, updatedContents);
            grunt.log.ok();
            if ( destination != filepath && deleteOriginal ) {
                grunt.log.write("\tDelete old file... " + filepath + " ... ");
                grunt.file.delete(filepath, {force:FORCE_DELETE_DANGEROUS});
                grunt.log.ok();
            }
        }
        else {
            grunt.fail.fatal("Trying to update the XD strings in some js files to XI strings,"
                + " but one of the files to update does not exist!"
                + "\nFile: "
                + filepath
                + "\n(Likely this file has been removed from the bld, or its location"
                + " within the bld has changed."
                + " \nGruntfile is hardcoding which files to update; please update Gruntfile"
                + " to either remove check on this file or update to its proper filepath in the bld)");
        }
    }

    /**
        Given an input String, returns a new String which is same as input, only with
        all occurances of 'xcalar design' replace with 'xcalar insight'
        (see method convertXDstrToXIstr for exact cases)

        @returns the modified String
    */
    function updateStringProductName(str) {

        // go through entire contents, replace each occurance of
        // 'xcalar design' (case ins.) with proper xcalar insight string
        var regex = /xcalar design/gi;
        var matches;
        var prevIdx = 0;
        var newStr = "";
        while ((matches = regex.exec(str)) !== null) {
            newStr += str.substring(prevIdx, matches.index);
            newStr += convertXDstrToXIstr(matches[0]);
            prevIdx = regex.lastIndex;
        }
        newStr += str.substring(prevIdx);
        return newStr;
    }

    /**
        Given a filepath and String as contents, write the contents at the filepath,
        tacking on a warning that the file has been autogenerated, and log this.

        @arg description: optional, String
            contexnt: There is a global hash 'generatedDuringBuild', and any key/value pair in it
            will be displayed to user upon compoetion summary.  (Useful for keeping track of
            key files generated during build process they might want to look at.)
            This function adds file being generated, in to that hash.
            'description' arg allows you to put a custom description of the file being
            generated.  If not supplied will just display the filename itself.

        @arg nowarning: optional, boolean, defaults to false;
            if true will not log the warning

    */
    function writeAutoGeneratedFile(filepath, content, description, nowarning) {

        if ( typeof nowarning == 'undefined' ) {
            nowarning = false;
        }

        if ( !nowarning ) {
            // determine if html or js comment type
            var filetype = path.extname(filepath)
            if ( filetype == '.js' ) {
                content = AUTOGENWARNINGJS + "\n" + content;
            }
            else if ( filetype == '.html' || filetype == '.htm' ) {
                content = AUTOGENWARNINGHTML + "\n" + content;
            }
            else {
                grunt.fail.fatal("Trying to autogen a file of type "
                    + filetype
                    + " .  Adds in an autogen warning comment, "
                    + " but only have comments suitable for js and html files. "
                    + "add one in for your file type!");
            }
        }
        grunt.log.write("Autogen: " + filepath + " ... ");
        /**
            in the case of the files we're autogenning always want to overwrite
            and it is valid case we'll have to do this    
        */
        grunt.file.write(filepath, content);
        grunt.log.ok();

        // anything added to 'generatedDuringBld' hash will get displayed to user at summary
        var key = path.basename(filepath);
        if ( description ) {
            key = description;
        }
        generatedDuringBuild[key] = filepath;
    }



                                                        /** WATCH FUNCTIONALITY TASKS AND FUNCTIONS */

    /**
        WATCH WORKFLOW - SUMMARY::

        'watch' is a plugin task, that if run, will run a chronjob, and watch for edits made to files
        in the tasks 'files' attr.  If any changes made to those files, it will run the list of tasks
        specified in the task's 'tasks' attr, and then restart the watch task again
        It also has an option 'livereload',
        which if true, will reload the browser once the current 'watch' task completes.

        > Use case example: watch for changes in less files of project src.  If one of those files changes,
        rather than regenerating the entire bld, only need to generate one new CSS file and put that
        in the bld.

        This Gruntfile provides list of options to specify which files/dirs, filetypes, etc. to watch
        and what to livereload on, so will configue watch dynamically based on cmd args supplied by user,

        There are some different ways you could do this: (1) have targets for every individual file/filetype,
        based on common tasks that should be run (i.e., a target for less files, a target for html files,
        when the 'tasks' attr for each of those targets is pre-determined before script starts),
        and run all of those watch targets concurrently using grunt-concurrent, or, (2) have a single 'watch'
        target that has 'files' set to every single file to be watched, but keep 'tasks' attr empty,
        and when the watch process starts due to one of those files changing, only then determine
        what tasks to run on the fly.
        (1) is more readable, but doing the second option, because grunt-concurrent will spawn a new Grunt
        task each time one of the targets invoked, and you can not    pass conatent to this child process
        (the info gathered from cmd params).

        - WORKFLOW STEP 1:
            when Grunt process first begins, when setting up grunt config, will
            determine initial list of files to watch based on cmd args, and set 'watch' 'files' attr
            to that.  WIl also determine which filetypes should have livereload on.
            This info will be set in grunt.config

        - WORKFLOW STEP 2:
            when watch is triggered (one of the files in 'files' attr is edited and saved),
            starts 'on' event for watch, accessible via grunt.event.on
            There, 1. determine what filetype is the file that was changed,
            2.  what bld tasks to run as a result, and 3. queue the tasks from the on event.
            If can not determine (not a common file, or its a common file but in an area
            of the bld you don't have enough context on, i.e., a js file that could be being
            used as a support file for generating bld), re-run the entire bld.
    */

    /**

            WATCH WORKFLOW - STEP 2:

        When 'watch' task is running, when one of the watch files is changes,
        This event will trigger, prior to the tasks for the target being executed.
        This section will:
            1. determine which tasks should be run depending on what file
                chnaged
            2. set format strings (the plugin tasks themselves, i.e., less, htmlmin, etc.,
                gather their src using format strings.  These are normally set to general globs
                for the purpose of generating the entire bld, but set them here to
                only process a specific file)
            3. queue the tasks found in 1.
    */
    grunt.event.on('watch', function(action, filepath, callingTarget) {

        grunt.log.writeln("filepath: " + filepath);

        // resolve filepath; (comes in as rel. to grunt cwd)
        filepath = path.resolve(filepath);
        grunt.log.writeln(("\n\nNEW WATCH EVENT:").bold.green
            + " A file being watched, was modified: " + filepath
            + "\nDetermine which build tasks to run.");

        /**
            Make sure work to complete a watch task, does not spawn additional, unecessary tasks.
            Example:
            Suppose you are watching all files in the src and bld.
            Now, a less file in the src changes.
            To handle only that one file, we still need to copy dependencies in to the bld.
            And now, when it gets generated, it overwrites the css file there.
            this now introduces a new watched change, and a new watch event spawns.
            To handle situations like this, have a global boolean which indicates if a watch
            task is current processing.  If so, terminate this new one which is being spawned.
        */
        if ( WATCH_CURR_PROCESSING ) {
            grunt.log.writeln(("This watch event was trigered as a result of currently processing watch task..." + ("IGNORE").red).bold
                + "\n(Watched file currently processing: "
                + WATCH_CURR_PROCESSING
                + ("\n\nIf you keep seeing this message, and ").yellow.bold
                + (filepath).bold
                + (" is an actual watched file you have edited,"
                + " it is most likely:"
                + "\n\t 1. One of the tasks triggered by a previous watch event failed").yellow.bold
                + "\n\t    (Probably file: " + WATCH_CURR_PROCESSING
                + ("\n\t 2. you are NOT running with the force option."
                + "\n(Because of that, no 'cleanup' task could be run to reset for a new watch event,"
                + " as all tasks - cleanup included - terminate after a single task failure, when --f not supplied.)"
                + "\nTo Correct this issue, run Grunt again with the --f option.  However, this will force all tasks (not just cleanup),"
                + " to continue, if you encounter a failure.\n").yellow.bold);
            return;
        }

        if ( grunt.file.isPathAbsolute(filepath) && grunt.file.exists(filepath) ) {
            grunt.log.debug("Filepath exists and is abs." + filepath);
        }
        else {
            grunt.fail.fatal("Filepath not abs. or doesn't exit");
        }
        WATCH_CURR_PROCESSING = filepath;

        var watchTaskList = [];

        filepathRelBld = getFilepathRelSrcOrBld(filepath);
        containingDirRelBld = path.dirname(filepathRelBld);
        filetype = getWatchFileType(filepath);
        grunt.log.debug("=============\n\tResolved filepath: "
            + filepath
            + " type: " + filetype
            + " con. dir : " + containingDirRelBld
            + " rl bld: " + filepathRelBld);

        var quick = false;
        switch (filetype) {
            case WATCH_FLAG_LESS:
                /**
                    less files at top level of less src - copy file to bld and run less on single file to generate csss
                    If it's anywhere else, could be a support file that gets included in other less files,
                    therefore re-generate entire css portion of the bld
                */
                quick = true;
                if ( grunt.file.arePathsEquivalent(containingDirRelBld, cssMapping.src) ) { // mindful for dirs of one having trailing / chars and another not
                    //1.  copy in only the change file.
                    //2. set the less template string used by the less:dist to determine source files, to only pick up this file
                    // (less target's cwd is the root of less files in the bld, so set the filepath rel to that)
                    grunt.log.writeln(("\nFile @ : "
                        + filepath
                        + " is one of the main less files; only need to re-generate single css file in to bld\n").bold.green);
                    grunt.file.copy(filepath, DESTDIR + filepathRelBld);
                    filepathRelFiletypeSrc = path.relative(cssMapping.src, filepathRelBld); // cwd of all the targets (except initial rsync) include DESTDIR in their cwd
                    grunt.config(LESS_TEMPLATE_KEY, filepathRelFiletypeSrc);
                    resolveDependencies(cssMapping.required);
                }
                else {
                    // not top level less files; re-gen entire css portion of bld; will use default template src of entire less dir
                    grunt.log.writeln(("\nFile @ : "
                        + filepath
                        + " is NOT a main less file; will regen entire css portion of bld\n").bold.green);
                    resolveDependencies([cssMapping.src]); // this will also copy in the changed watch file
                }
                watchTaskList.push(BUILD_CSS);
                break;
            case WATCH_FLAG_JS_SRC:
                /**
                    if js contained anywhere nested in site/js/, only need copy single file over; no processing.
                    Any other js file - rebuild ENTIRE bld (it could be a support js for other bld processes)
                */
                if ( grunt.file.doesPathContain(jsMapping.src, filepathRelBld) ) {
                    grunt.log.writeln(("\nFile @ : "
                        + filepath
                        + " is one of the main js files to build - can skip length bld process\n").bold.green);
                    grunt.file.copy(filepath, DESTDIR + filepathRelBld);
                    quick = true;
                }
                else {
                    grunt.log.writeln(("\nFile @ : "
                        + filepath
                        + " is NOT a main js file. Not enough context to know how to re-build quickly").bold.green);
                }
                break;
            case WATCH_FLAG_HTML_SRC:
                /**
                    if html at top level of src for html files, only need copy over the single
                    file and do processing on it.
                    Otherwise, need to re-generate entire html portion of bld
                */
                quick = true;
                var bldEntireHtml = true;
                if ( grunt.file.arePathsEquivalent(containingDirRelBld, htmlMapping.src) ) {
                    // the templating will route it within dest, and so you need to set template key for processing to what that would end up as
                    filepathRelFiletypeSrc = path.relative(htmlMapping.src, filepathRelBld);
                    outputFilepaths = getTemplatingOutputFilepaths(filepathRelFiletypeSrc);
                    // create templating key out of this.
                    /**
                        some of the files get output to multiple different files.
                        Currently the templating string can only take one file.
                        Can create n number templating strings on the fly,
                        but then you will need to template the destinations as well.
                        Just not worth it right now since this is a corner case for a signle file...
                        so in the case that it's one of the files that will get output ato
                        multiple files,
                        justs rebuild entire html...
                    */
                    if ( outputFilepaths.length == 1 ) {
                        grunt.log.writeln(("\nFile @ : "
                            + filepath
                            + " is one of the main html files to build, and templates to only one output.\n"
                            + "Will re-process this one file only").bold.green);
                        bldEntireHtml = false;
                        // copy in the watched file
                        // set the template key used by the html processing tasks for picking up their src, to only pick up this file
                        // note - their cwd is the root of html files being processed, so make template key value rel to that
                        grunt.file.copy(filepath, DESTDIR + filepathRelBld);
                        // set template key for staging only this file
                        //grunt.config(STAGE_HTML_TEMPLATE_KEY, filepathRelFiletypeSrc); // stage only the HTML file you want
                        grunt.config(STAGE_HTML_TEMPLATE_KEY, filepathRelFiletypeSrc); // stage only the HTML file you want
                        // but make sure all dependencies are within the html staging area too
                        resolveDependencies(htmlMapping.required, SRCROOT, HTML_STAGING_I_ABS, htmlMapping.src); // only maintain dir structure from htmlMapping.src
                        grunt.config(HTML_TEMPLATE_KEY, outputFilepaths[0]); // will process only your HTML file!
                        srcProcessing = grunt.config(HTML_TEMPLATE_KEY);
                        //grunt.config(HTML_TEMPLATE_KEY, filepathRelFiletypeSrc); // will process only your HTML file!
                    }
                }
                if ( bldEntireHtml ) {
                    /**
                        html file not at top level of html src, or templating
                        will write to multiple destinations.
                        for case 1, could be file that
                        must be included in others, etc.
                        Rebuild entire html portion of the bld.
                        Make sure entire html bld portion present
                        Use the default src values (entire bld portion) so no n eed to set template key
                    */
                    grunt.log.writeln(("\nWatched file @ : "
                        + filepath
                        + " is NOT a main html file, or, will template to multiple output files"
                        + " (watch doesn't support this atm). regen entire html portion of bld").bold.green);
                    resolveDependencies([htmlMapping.src]);
                }
                watchTaskList.push(BUILD_HTML);
                break;
            case WATCH_FLAG_CONSTRUCTORS:
                watchTaskList.push(CONSTRUCTOR_FILES); // this custom task should take care of setting cwd attr templates depending if watch task or not
            case WATCH_FLAG_CSS: // fall through on all the bld cases - you don't do anything but reload
            case WATCH_FLAG_HTML_BLD:
            case WATCH_FLAG_JS_BLD:
                // nothing to do but reload (if they even want)
                grunt.log.writeln(("\nWatch file @ : "
                    + filepath
                    + " is a common build file, and no follow up tasks within the build need to be done.").bold.green);
                quick = true;
                break;
            default:
                // cant determine
                // if this is a bld file, not sure what to do with it
                if ( !isSrcFile(filepath) ) {
                    grunt.fail.fatal("Could not determine filetype, for trying to determine how to rebuild edited file.\n"
                        + "However, this is also not a src file, so I can not even rebuild the entire project.\n"
                        + "If bld file, need more context for how to proceed.");
                }
                grunt.log.writeln(("\nCan not determine filetype of "
                    + filepath
                    + "; rebuild everything").bold.green);
                break;
        }
        /**
            if never found a quick bld process, re-build entire project.
            If user has specified 'watch' alongside a main bld process,
            use that bld process (ex. 'grunt trunk watch)
            Else make a 'debug' bld
        */
        if ( !quick ) {
            /** initial rsync uses no overwrite option,
                so still copy in the changed file manually. */
            grunt.log.writeln(("\nThere was not enough context for edited file: "
                + filepath
                + " to determine a quick re-build; will copy edited file over"
                + " and re-run the entire build.").bold.green);
            grunt.file.copy(filepath, DESTDIR + filepathRelBld);
            var rebldFlavour = DEBUG;
            if ( BLDTYPE ) { // if only running watch task, you wouldn't have this set to anythign
                rebldFlavour = [BLDTYPE];
            }
            watchTaskList.push(rebldFlavour);
        }
        /**
            set livereload option
        */
        reloadTypes = grunt.config(WATCH_LIVERELOAD_HASH_CONFIG_KEY);
        grunt.log.debug("~~~~~~~~~~~~ GET RELOAD PROPERTIES FOR CURRENT WATCH TASK");
        if ( reloadTypes.hasOwnProperty(filetype) ) {
            /**
                livereloading is not working on css files.
                It appears this is a common bug with livereload.
                For now I will disable it to prevent confusion.
            */
            if ( filetype == WATCH_FLAG_CSS ) {
                grunt.log.debug("a css file, do not livereload it");
            }
            else {
                grunt.config('watch.options.livereload', reloadTypes[filetype]);
            }
        }

        // finalize
        grunt.log.debug("Schedule build finalize");
        watchTaskList.push(FINALIZE);

        /**
            cleanup, even if no tasks scheduled..
        */
        grunt.log.debug("Schedule cleanup for next watch process...");
        watchTaskList.push(COMPLETE_WATCH);

        /**
            queue all of the tasks determined to run
        */
        grunt.log.debug("\n\n    ~~~~ DEPLOY TASKS\n\n");
        for ( var atask of watchTaskList ) {
            grunt.log.writeln("Queue task: " + atask);
            grunt.task.run(atask);
        }

        grunt.log.writeln("done");
    });

    /**
        Cleans up global data for next watch task.

        Note: This needs to be a TASK, rather than a function,
        so that it can be queued at the end of the list
        of whatever tasks were determined to run for a watch process,
        so that it will execute only after all of them have run.
        This is so, the boolean indicating there
        is a current watch process going on, stays true for the
        entire duration of those watch tasks.
    */
    grunt.task.registerTask(COMPLETE_WATCH, function() {

        grunt.log.debug("Reset config data for next watch task....");

        /**
        if ( WATCH_CURR_PROCESSING) {
            grunt.log.writeln("working on a file, see if there's swp");
            // get filename and see if there's a swp file for that
            var filename = path.basename(WATCH_CURR_PROCESSING);
            grunt.log.writeln("filename: " +filename);
            var dirpath = path.dirname(WATCH_CURR_PROCESSING);
            grunt.log.writeln("dirpath: " + dirpath);
            var swpFile = dirpath + '/.' + filename;
            grunt.log.writeln("sw " + swpFile);
            if ( grunt.file.exists(swpFile) ) {
                grunt.log.writeln("THERE IS A SWP FILE: " + swpFile);
                grunt.file.delete(swpFile, {force:FORCE_DELETE_DANGEROUS});
            }
            else {
                grunt.log.writeln("doesn't exist");
            }
        }
        */

        WATCH_CURR_PROCESSING = false;

        /**
            reset all template keys in the grunt config.
            why needed - example: suppose yoiu change a single less file,
            watch task will dynamically set the less src to indicate just that file.
            Now suppose a non-standardf file gets changed next, and so an entire
            bld gets kicked off.  if you have not set the template value back,
            the full bld will not work as it will still only be gettingt ath single less file.
        */
        setTemplateKeyDefaults();
        // livereload option
        grunt.config('watch.options.livereload', RELOAD_DEFAULT);

        // check if all option specified, if so warn them it could take awhile (this will display before watch reloads..)
        if ( grunt.option(WATCH_FLAG_ALL) ) {
            grunt.log.warn(("\nYou have chosen to watch all files in the source and build.\n"
                + "This could take a minute or two to load...\n"
                + "(You must run with --v option to know when watch is ready;"
                + " without --v option it will say 'waiting...' both while loading and when loading complete)\n").bold.red);
        }
    });

    /**

        Given an absolute filepath to a file, determine which, if any,
        file type it is,
        and return that corresponding attribute/key of the WATCH_fILE_TYPES dict
        (these attributes are the filetype boolean flags available as cmd params)
        if can not determine, returns undefined

        Modularizing this because this needs to be determine in by a couple different methods,
        and need to dmake sure handling case of if src and dest dirs are descendent of each other
    */
    function getWatchFileType(filepath) {

        var filetype;
        var fileExt = path.extname(filepath);

        // standalone case: for constructor, only if they edit the file
        if ( path.basename(filepath) == CONSTRUCTOR_TEMPLATE_FILE ) {
            grunt.log.debug("It's a constructor");
            filetype = WATCH_FLAG_CONSTRUCTORS;
        }
        else {

            switch (fileExt) {

                // path.extname returns '.' char followed by file extension
                case '.html':
                    // sep logic if bld or src
                    if ( grunt.file.doesPathContain(SRCROOT + htmlMapping.src, filepath) ) {
                        filetype = WATCH_FLAG_HTML_SRC;
                    }
                    else if ( grunt.file.doesPathContain(DESTDIR + htmlMapping.dest, filepath) ) {
                        filetype = WATCH_FLAG_HTML_BLD;
                    }
                    else {
                        grunt.fail.fatal("Can not determine if html file @ "
                            + filepath
                            + " is a src file or bld file");
                    }
                    break;
                case '.js':
                    // check for dest case first because it's nested in src
                    if ( grunt.file.doesPathContain(DESTDIR + jsMapping.dest, filepath) ) {
                        filetype = WATCH_FLAG_JS_BLD;
                    }
                    else if ( grunt.file.doesPathContain(SRCROOT + jsMapping.src, filepath) ) {
                        filetype = WATCH_FLAG_JS_SRC;
                    }
                    else {
                        grunt.fail.fatal("Can not determine if js file @ "
                            + filepath
                            + " is a src file or bld file");
                    }
                    break;
                case '.css':
                    filetype = WATCH_FLAG_CSS;
                    break;
                case '.less':
                    filetype = WATCH_FLAG_LESS;
                    break;
                default:
                    grunt.log.writeln(("Can not determine filetype of " + filepath).bold.red);
            }
        }
        // dev check... make sure the filetype you set to is a valid key... otherwise you have changed logic and needdd to follow up
        if ( filetype && !WATCH_FILE_TYPES.hasOwnProperty(filetype) ) {
            grunt.fail.fatal("Error trying to determine file type for "
                + filepath
                + "\nShould return one of the keys of the 'WATCH_FILE_TYPES' dict.\n"
                + "Filetype determined "
                + filetype
                + " is not a key\n"
                + "(Keys are: "
                + Object.keys(WATCH_FILE_TYPES)
                + "\NThis indicates a logic error; contact jolsen@xcalar.com");
        }
        return filetype;
    }

    /**
        Returns a hash which has a key for each key of WATCH_FILE_TYPE,
        and value of the key is boolean true/false indicating weather watches files of that type
        should have liveReload done.
        Determines based on 'livereload' cmd option

        context: when 'watch' plugin invoked, if liveReload option is true,
        then a browser refresh is done after all tasks for the watch have been completed.

        ways to specify the param
        (1) as boolean flag (liveReload on all filetypes)
            --livereload
        (2) as option that takes value (list of types to include or exclude)
            --livereload=less        //liveReload on all less files
            --livereload=html,less    // liveReload on all html src files and less files
            --livereload=-less,js    // liveReload on all types EXCEPT less files and js src files

    */
    function getReloadTypes() {

        grunt.log.writeln("Determine which types of files should be live reloaded, if they are being watched and change...");

        var reloadByType = {},
            reloadDefault = RELOAD_DEFAULT,
            reloadTypes = [],
            exclusionType = false;
        var reloadValStr, type;

        if ( grunt.option(WATCH_OP_LIVE_RELOAD) ) {

            grunt.log.writeln(("You have specified the --"
                + WATCH_OP_LIVE_RELOAD
                + " option, to reload the browser after building"
                + " edited watched files\n"
                + "If livereload is not working, please install the google chrome"
                + "livereload plugin, or, if you have the plugin, refresh it.").red.bold);

            reloadValStr = grunt.option(WATCH_OP_LIVE_RELOAD);
            /**
                if option specdified as a boolean flag - reload all types.
                Else, it's given as a list of types to reload/not to reload
            */
            if ( reloadValStr == true ) {
                reloadDefault = true;
                all = true;
            }
            else {
                // if the first char is a '-', it means everything BUT these
                if ( reloadValStr.charAt(0) == '-' ) {
                    exclusionType = true;
                    reloadDefault= true;
                    // remove that first char
                    reloadValStr = reloadValStr.substring(1, reloadValStr.length); // gets all but first char
                }
                // split on comma to get all the targets they want reloading on/dont want reloading on
                reloadTypes = reloadValStr.split(OPTIONS_DELIM);
            }
        }

        // load in defaults
        for ( type of Object.keys(WATCH_FILE_TYPES) ) {
            if ( type == WATCH_FLAG_CSS ) {
                reloadByType[type] = false;
            }
            else {
                reloadByType[type] = reloadDefault;
            }
        }
        // now all specific types
        for ( type of reloadTypes ) {
            // make suree valid
            if ( !WATCH_FILE_TYPES.hasOwnProperty(type) ) {
                grunt.fail.fatal("You've supplied an invalid value for param --"
                            + WATCH_OP_LIVE_RELOAD
                            + ".  Valid values (comma sep. combinations): "
                            + Object.keys(WATCH_FILE_TYPES)
                            + "\nTo reload on change of any watchoed file, supply param as boolean flag "
                            + "--" + WATCH_OP_LIVE_RELOAD);
            }
            if ( type == WATCH_FLAG_CSS && !exclusionType ) {
                grunt.fail.fatal("Can not livereload css files due to a bug in livereload."
                    + " \nIf this is a valid use case, contact jolsen@xcalar.com and can try some"
                    + " workaround.");
            }
            reloadByType[type] = !reloadDefault;
        }

        for ( type of Object.keys(reloadByType) ) {
            grunt.log.writeln("\t>>: Reload " + type + " ? " + reloadByType[type]);
        }
        return reloadByType;
    }

    /**
        returns a list of full filepaths of each file or dir user wants to watch.
        Globbing patterns used when possible (i.e., if they want to watch every html
        file, glob string in list, rather than a list of filepath of eveory html file
    */
    function getWatchFiles() {

        grunt.log.writeln("Gather watch files...");

        // start high --> low on which files to match
        var watchFilesDict = {}, // filepaths of files to watch (in dict to avoid dupes)
            watchTypesDict = {}; // general types to watch (WATCH_FILE_TYPE keys),
                // keep track so can compare individual files against types,
                // and only add in if type isn't represented. as dict for quick check

        // Level HIGH: watch everything
        if ( grunt.option(WATCH_FLAG_ALL) ) {
            grunt.log.writeln(("\nYou have chosen to watch all files in the source and build.\n"
                + "This could take a minute or two to load...\n"
                + "(You must run with --v option if you want to know when watch is ready;\n"
                + " without --v option, Grunt will display 'waiting...'"
                + " both while watch is still loading, and once loading complete)\n").bold.red
                + ("(To watch all of just certain filetypes, you can specify any of the following boolean flags:\n"
                + Object.keys(WATCH_FILE_TYPES)
                + "\n").yellow.bold);

            /**
                add all the filetypes to the watchFilesDict
                (if you glob on ALL files, it will take a really long time to load.
                And I'm not sure how to glob on multiple file extensions in grunt; to-do
            */
            for ( validType of Object.keys(WATCH_FILE_TYPES) ) {
                watchTypesDict[validType] = true;
            }
        }

        // Level MEDIUM: watch specific types of files

        // check first if general 'types' option specified
        // if so, gather which groups based on if excl. or incl. variety
        var typesVal, type, remove;
        var types = [];
        if ( grunt.option(WATCH_OP_WATCH_TYPES) ) {
            typesVal = grunt.option(WATCH_OP_WATCH_TYPES);
            remove = false; // this boolean will tell you, what the user specifies, to remove it from the target list or add it
            if ( typesVal.charAt(0) == '-' ) {
                // will put every possible group in, and remove only ones found from the cmd option
                for ( validType of Object.keys(WATCH_FILE_TYPES) ) {
                    watchTypesDict[validType] = true;
                }
                remove = true;
                // remove the first char for specifying exclusion
                typesVal = typesVal.substring(1, typesVal.length); // gets all but first char
            }
            types = typesVal.split(OPTIONS_DELIM);
            for ( type of types ) {
                // make suree valid
                if ( !WATCH_FILE_TYPES.hasOwnProperty(type) ) {
                    grunt.fail.fatal("You've supplied an invalid value, "
                                    + type
                                    + ", for param --"
                                    + WATCH_OP_WATCH_TYPES
                                    + ".  Valid values (comma sep. combinations): "
                                    + Object.keys(WATCH_FILE_TYPES)
                                    + ".  To watch all files, supply boolean flag --all");
                }
                if ( remove ) {
                    delete watchTypesDict[type];
                }
                else {
                    watchTypesDict[type] = true;
                }
            }
        }
        // for each possible type, see if user specified via boolean flag,
        // or as desired group via general 'type' option
        // if so, add that glob pattern to the watchFileDict
        for ( type of Object.keys(WATCH_FILE_TYPES) ) {
            if ( grunt.option(type) || watchTypesDict.hasOwnProperty(type) ) {
                watchFilesDict[WATCH_FILE_TYPES[type]] = true; // keys  of this dict will be final list to send back
                watchTypesDict[type] = true; // maintaining this so can check for individual files, if their type already represented
            }
        }

        // LOW level: watch specific files and/or dirs, config based on each
        // if a glob for that tyupe already given, skip over it as an entry; already accountaed for

        // get specific files and/or dirs user has specified
        // put initially in hash to avoid dupes, then go through and add to config

        var fileDict = {},
            fileList = [],
            dirDict = {},
            dirList = [];
        var file, dir;

        /** normalize values from the possible options */

        // if common op specified - append those files in
        if ( grunt.option(WATCH_FLAG_COMMON_SRC_FILES) ) {
            fileList = fileList.concat(COMMON_WATCH_SRC_FILES);
        }
        // if one single file specified
        if ( grunt.option(WATCH_OP_SINGLE_FILE) ) {
            fileList.push(grunt.option(WATCH_OP_SINGLE_FILE));
        }
        // if m ulti , sep list of files specified
        if ( grunt.option(WATCH_OP_MULTIPLE_FILES) ) {
            val = grunt.option(WATCH_OP_MULTIPLE_FILES).toString();
            // if user specifies <param>= on cmd once - grunt.option(<param> returns a String of that value
            // if they do more than once it returns a list.  doing toString() will put it as a comma sep list.
            // so long as using OPTIONS_DELIM as comma sep...
            fileList = fileList.concat(grunt.option(WATCH_OP_MULTIPLE_FILES).toString().split(OPTIONS_DELIM));
        }
        // put in hash to eliminate any dupes and retrieve for final unique list
        for ( file of fileList ) {
            fileDict[file] = true;
        }
        fileList = Object.keys(fileDict);

        // same process for dirs...
        if ( grunt.option(WATCH_FLAG_COMMON_SRC_DIRS) ) {
            dirList = dirList.concat(COMMON_WATCH_SRC_DIRS);
        }
        if ( grunt.option(WATCH_OP_SINGLE_DIR) ) {
            dirList.push(grunt.option(WATCH_OP_SINGLE_DIR));
        }
        if ( grunt.option(WATCH_OP_MULTIPLE_DIRS) ) {
            dirList = dirList.concat(grunt.option(WATCH_OP_MULTIPLE_DIRS).toString().split(OPTIONS_DELIM));
        }
        for ( dir of dirList ) {
            dirDict[dir] = true;
        }
        dirList = Object.keys(dirDict);

        /** process the values */

        // DIRS:  go through all dirs make sure valid, put in array as glob patterns.
        var dirVal;
        for ( dirVal of Object.keys(dirDict) ) {
            if ( !grunt.file.exists(dirVal) || !grunt.file.isDir(dirVal) ) {
                grunt.log.warn("Either dir " + dir + " is not a dir or is not accessible.  I will not watch changes in this directory.");
            }
            else {
                watchFilesDict[dirVal + "**/*"] = true;
            }
        }

        /**
             go through each gathered value, make sure exists, make an individual target for each.
            if its in one that superscenes (i.e., an html src file standalone, when html full src already registered),
            skip over to avoid blding more than once unecessarily
        */
        var filepath;
        for ( filepath of Object.keys(fileDict) ) {

            // if its an absolute path, determine if its a bld or src file
            if ( !grunt.file.isPathAbsolute(filepath) ) {
                filepath = WATCH_FILES_REL_TO + filepath;
            }

            // now that path been normalized to abs; check it exists
            if ( !grunt.file.isFile(filepath) || !grunt.file.exists(filepath) ) {
                grunt.log.warn("Either file " + filepath + " is not a file or is not accessible.  I will not watch this file.");
                grunt.fail.fatal("Doesn't exist!");
            }

            // get filetype
            filetype = getWatchFileType(filepath);
            // is file of this type (html bld, html src, less, etc.) already accounted for via a specific type option?
            if ( watchTypesDict.hasOwnProperty(filetype) ) {
                continue;
            }
            else {
                watchFilesDict[filepath] = true;
            }
        }

        var watchFilesList = Object.keys(watchFilesDict);
        for ( file of watchFilesList ) {
            grunt.log.writeln("\t>>: " + file);
        }
        return watchFilesList;
    }

                                                    /** PARAM VALIDATION AND CONFIGURATION  */

    /**
        configure global params used throughout the bld process,
        which rely on cmd options
        1. first determine SRCROOT and BLDROOT
        2. set globals/config data which depend on theser
        3. gather remaining bld flags and options
        4. configure watch functionality based on watch params/options
            ( must do 2 first - many of the watch params depend on SRCSROOT and BLDROOT)
    */
    function processCmdOptions() {

        // Do general validation of the params
        grunt.log.writeln("Validate cmd parameters");
        validateCmdParams();
        grunt.log.ok();

        // now that params validated, get the values and set for script
        grunt.log.debug("Get validated values from user specified CLI options");
        getCmdParams();

        // set all global variables used by script that require the cmd params that are now gathered
        grunt.log.debug("Set all other globals and config data depending on validated CLI values");
        setGlobalsDependingOnCmdParams();
    }

    /**
        a custom help menu
    */
    function displayHelpMenu() {
        grunt.log.writeln("\n");
        fancyLine();
        grunt.log.writeln(("\nThis grunt file will either generate a build from a xcalar gui project, watch for changes in files, or both.\n").green.bold);
        grunt.log.writeln((("Useage:").red + ("\n\tgrunt [options] [task [task ...]]").yellow).bold);
        var dummysrc = "/home/myhome/myxlrguisrc";
        grunt.log.writeln((("\nExample:").red
            + ("\n\tgrunt " + DEV
            + " --" + BLD_OP_SRC_REPO + "=" + dummysrc
            + " --" + BLD_OP_PRODUCT + "=XI"
            + " watch "
            + WATCH_FLAG_LESS).yellow).bold);
        grunt.log.writeln("\n\t(Generate a dev build of the XI flavor, from the xalar-gui src code at"
            + "\n\t" + dummysrc + ", then watch the src for changes in any less"
            + "\n\tfiles, and regen relevant css in to the created build, if any detected)");
        grunt.log.writeln((("\nAvailable tasks::").red).bold);
        grunt.log.writeln((("\n\n[Build tasks:]\n").yellow).bold);
        for ( task of Object.keys(VALID_BLD_TASKS) ) {
            grunt.log.writeln(("\t" + task).green + ": " + VALID_BLD_TASKS[task]);
        }
        grunt.log.writeln((("\n\n[Other tasks:]\n").yellow).bold);
        for ( task of Object.keys(VALID_OTHER_TASKS) ) {
            grunt.log.writeln(("\t" + task).green + ": " + VALID_OTHER_TASKS[task]);
        }
        grunt.log.writeln((("\nAvailable options::\n").red).bold);
        for ( type of Object.keys(OPTIONS_DESC_HASH) ) {
            for ( subtype of Object.keys(OPTIONS_DESC_HASH[type]) ) {
                grunt.log.writeln((OPTIONS_DESC_HASH[type][subtype]['header'] + "\n").bold.yellow);
                // list all the options
                for ( op of Object.keys(OPTIONS_DESC_HASH[type][subtype]['matchingoptions']) ) {
                    grunt.log.writeln((OPTIONS_DESC_HASH[type][subtype]['matchingoptions'][op]['useage']).green);
                    grunt.log.writeln(OPTIONS_DESC_HASH[type][subtype]['matchingoptions'][op]['desc']);
                }
            }
        }
        // (FLAGS_DESC_STR
        //OPS_DESC_STR)));
        grunt.log.writeln("\n\n");
        fancyLine();
    }

    /**
        Get the main values passed via cmd line
        which have globals directly depending on them
        such as SRCROOT, DESTDIR, BLDTYPE, etc.
    */
    function getCmdParams() {

        /**
            Go through requested tasks;
            set bld type based on what task being deployed
            check if watch functinoality requested
        */
        var tasksRequested = grunt.cli.tasks;
        // check if one of the tasks is one of the valid bld tasks
        // if no task of ANY kind given, then grunt calls 'default'
        // which is currently a bld task
        var watchTask = false;
        var task;
        if ( tasksRequested.length == 0 ) {
            grunt.fail.fatal("No tasks found!  This should not happen -"
                + " (have you change Gruntfile to allow a 'default' task now?)"
                + " If so, then you need to handle this by setting the BLDTYPE In this scenario to default"
                + " since it is valid to run Gruntfile with no task if you have a default");
        }
        for ( task of tasksRequested ) {
            if ( Object.keys(VALID_BLD_TASKS).indexOf(task) !== -1 ) {
                grunt.log.writeln("Will run bld task..");
                BLDTYPE = task;
                IS_BLD_TASK = true;
            }
            if ( task == 'watch' ) {
                grunt.log.writeln("Will run watch task...");
                IS_WATCH_TASK = true;
            }
        }

                // SECTION: GET SRCROOT AND DESTDIR - many globals depend on this; do first

        /**
            configure SRCROOT
             --xcalarguiroot option:
             workspace to generate build from (other than cwd)
        */
        SRCROOT = grunt.option(BLD_OP_SRC_REPO) || process.cwd();
        // put trailing / if it's not there, to keep things consistent
        if(!SRCROOT.endsWith(path.sep)) { SRCROOT = SRCROOT + path.sep; }
        if(!grunt.file.exists(SRCROOT)) {  // make sure this is a valid dir
            grunt.fail.fatal("--" + BLD_OP_SRC_REPO + " Error:"
                + " Repo to generate build from specified as "
                + SRCROOT
                + ", but this dir does not exist.");
        }

        /**
            --buildoutput option ::
            where bld should be rooted at; defaults to SRCROOT
            if absolute path specified - will create that full path and int. dirs
            if relative path specified - will be rel. to SRCROOT.

            This option is being used to determine final location of bld.
            For DEV blds only, the final location should default to the SRCROOT
            and for all the other blds, it should get its own directory just for bld output
            (which can be customized by further options below)
        */
        BLDROOT = grunt.option(BLD_OP_BLDROOT) || SRCROOT;
        if(!BLDROOT.endsWith(path.sep)) { BLDROOT = BLDROOT + path.sep; }
        // if they gave a relative path, make it relative to the src dir
        if (!grunt.file.isPathAbsolute(BLDROOT)) { BLDROOT = SRCROOT + BLDROOT; }

        // the default is for it to be src, but in case this default changes..
        if ( grunt.option(BLD_FLAG_SRC_BLD_SAME) ) {

            // if they specified a build root, and it's not the src root
            if ( grunt.option(BLD_OP_BLDROOT) ) {

                if ( BLDROOT != SRCROOT ) {
                    grunt.fail.fatal("Specified flag --"
                        + BLD_FLAG_SRC_BLD_SAME
                        + " to set build dir where index.html begins, to be same as project source."
                        + "\nHowever, option --"
                        + BLD_OP_BLDROOT
                        + " which sets the top-level buildroot, is not same as project source."
                        + "\nProject source: "
                        + SRCROOT
                        + "\nTop level build root is stored as: "
                        + BLDROOT);
                }
                else {
                    BLDROOT = SRCROOT;
                }
            }
        }

        // flag :: timestamp the build so it will be uniquely identified.  useful if you have a dedicated bld dir you want to congregate blds at
        var timestampBld = grunt.option(BLD_FLAG_TIMESTAMP_BLDDIR) || false;
        if ( timestampBld ) {
            // if they gave this but also gave that dest dir should be same as src, this is a problem
            if ( grunt.option(BLD_FLAG_BLD_DEST_SAME) ) {
                grunt.fail.fatal("You specified boolean flag --"
                    + BLD_FLAG_BLD_DEST_SAME
                    + " which will set the build output where index.html begins to the project source,"
                    + "\nbut also flag --"
                    + BLD_FLAG_TIMESTAMP_BLDDIR
                    + ", but this flag will take the top level build root, create a dir of the current timestamp,"
                    + " and then root index.html there."
                    + "\nSo this combination of flags is not possible.");
            }

            BLDROOT = BLDROOT + Date.now() + path.sep;
        }

        // option :: product flavor
        PRODUCT = grunt.option(BLD_OP_PRODUCT) || XD;
        var prodNameMapping = {
            XD:XDprodName,
            XI:XIprodName
        };
        if ( prodNameMapping.hasOwnProperty(PRODUCT) ) {
            PRODUCTNAME = prodNameMapping[PRODUCT];
        }
        else {
            grunt.fail.fatal("Product type "
                + PRODUCT
                + " not valid. Valid values for this arg: "
                + Object.keys(prodNameMapping)
                + ".  If you did not supply the cmd option --"
                + BLD_OP_PRODUCT
                + " This indicates a logic error; contact jolsen@xcalar.com");
        }

        /**
            destination directory - i.e, dir nested at or beneath top level build root,
            where index.html would be.

            cases:
                1. they specified directly via --destdir
                2. no params about it, and this is a non-dev bld, defaults to BLDROOT/<product name>
                3. no params about it, and this is a dev bld,d defaults to BLDROOT
                4. they've specified --setdesttoroot, in which case should be product root
        */
        if ( grunt.option(BLD_OP_DESTDIR) ) {
            dest = grunt.option(BLD_OP_DESTDIR);
            if ( grunt.option(BLD_FLAG_SRC_DEST_SAME) && dest != SRCROOT ) {
                grunt.fail.fatal("Specified destdir for build with boolean flag --"
                    + BLD_OP_DESTDIR
                    + " as: "
                    + dest
                    + ", which is diff from the project root of "
                    + SRCROOT
                    + "\nBut, also specified boolean flag --"
                    + BLD_FLAG_SRC_DEST_SAME
                    + " to indicate dest should be same as project root!");
            }
            if ( timestampBld ) {
                grunt.fail.fatal("Specified destdir for build with boolean flag --"
                    + BLD_OP_DESTDIR
                    + " but also boolean flag --"
                    + BLD_FLAG_TIMESTAMP_BLDDIR);
            }
            DESTDIR = dest; // case 1
            if(!DESTDIR.endsWith(path.sep)) { DESTDIR = DESTDIR + path.sep; }
            if (!grunt.file.isPathAbsolute(DESTDIR)) { DESTDIR = BLDROOT + DESTDIR; }
        }
        else {

            if ( grunt.option(BLD_FLAG_SRC_DEST_SAME) || (IS_BLD_TASK && BLDTYPE == DEV) || !IS_BLD_TASK ) { // case 3 & 4
                // watch used mostly by devs who work with a dev bld,
                // so also for this case default to same proj src
                // siomilarly if they use for generating constructor file,
                // which is standalone task once per project
                DESTDIR = BLDROOT;
            }
            else  { // case 2
                DESTDIR = BLDROOT + PRODUCTNAME + path.sep;
            }
        }

        // make sure destdir rooted at or beneath bldroot
        if ( BLDROOT != DESTDIR && !grunt.file.doesPathContain(BLDROOT, DESTDIR) ) {
            grunt.fail.fatal("The destination directory where index.html should go: "
                + DESTDIR
                + "\nis NOT descendent of the top level build root!"
                + BLDROOT);
        }

        if ( IS_WATCH_TASK && !IS_BLD_TASK && !grunt.file.exists(DESTDIR) ) {
            grunt.fail.fatal("You are running a watch task;"
                    + " your xcalar-gui project root is "
                    + SRCROOT
                    + "\nand output for this project's bld is mapped as "
                    + DESTDIR
                    + "\nHowever, this bld directory does not exist"
                    + "\n(Note if you did not specify the --"
                    + BLD_OP_BLDROOT
                    + " option, this value is probably the default build destination for your project source)"
                    + "\n\nIf your bld output is just"
                    + " your src directory (such as the case if this is a dev bld),"
                    + " then re-run with booolean flag --"
                    + BLD_FLAG_SRC_DEST_SAME
                    + "\nElse, to specify an alternative build location, re-run with option: --"
                    + BLD_OP_TOP_LEVEL_BLDROOT
                    + "=<your bld location>");
        }

                // flag :: dont overwrite if build dir already exists
        OVERWRITE = !(grunt.option(BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS) || false);

        /**
            this will alow you to force delete over files outside Grunt dir
            carefu; - if you specify a destdir which exists it will rm -r it!
        */
        FORCE_DELETE_DANGEROUS = grunt.option("pokacuka") || false;

        // flag :: retain src code used for bld generation (less files, HTML with templating code, etc.), in final bld
        KEEPSRC = grunt.option(BLD_FLAG_RETAIN_FULL_SRC) || false;
        /**
            DANGER

            If SRCROOT and DESTDIR are same
            (current default behavior for DEV blds)
            then regardless what they specified on cmd

            - do NOT overwrite if bld dir alreadfy exists
            - do keep src (else you're goping to be deleting the project src code itself)

            Please keep this check in!!!!  Because so long as it is defaulting to false
            they would end up deleting their project source without realizing it
        */
        if ( DESTDIR == SRCROOT || DESTDIR == process.cwd() ) {
            KEEPSRC = true;
            OVERWRITE = false;

            // check if they specifically did the options in the dangerous way
            // because if so in this scenario I think they misunderstand the purpose of this option
            if ( BLDTYPE == DEV ) {
                if ( grunt.option(falseBooleanFlagPrefix + BLD_FLAG_RETAIN_FULL_SRC) ) {
                    grunt.fail.fatal("You are executing a dev bld, "
                        + " and letting the bld output be rooted in your project source."
                        + "\nBut, you specified flag --"
                        + BLD_FLAG_RETAIN_FULL_SRC
                        + " to be false."
                        + "\nThis means you would be deleting your project source code!!"
                        + " (i.e., untemplated html files, less files, etc."
                        + "\nI am going to stop Grunt now to prevent this from happening."
                        + "\nIf you really wanted this behavior, "
                        + " please contact jolsen@xcalar.com to explain the use case"
                        + " and I can update the Gruntfile to handle it");
                }
                if ( grunt.option(falseBooleanFlagPrefix + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS) ) {
                    grunt.fail.fatal("You are executing a dev bld, "
                        + " and letting the bld output be rooted same as your project source dir."
                        + "\nBut, you supplied flag --"
                        + BLD_FLAG_NO_OVERWRITE_BLDDIR_IF_EXISTS
                        + " to be false."
                        + "\nThis means you will overwrite the blddir if it already exists -"
                        + " but in this case, your bld dir IS your source dir and that's why it exists!"
                        + " This would take out your entire project source!"
                        + "\nI am stopping Grunt now to prevent this from happening");
                }
            }
        }

        // option: (for trunk blds) , alt. roots for backend src and bld
        // get the list of tasks and see if trunk is in it
        if ( BLDTYPE == TRUNK ) {
            xlrdirEnvVar = 'XLRDIR';
            BACKENDBLDDIR = grunt.option(BLD_OP_BACKEND_SRC_REPO) || process.env[xlrdirEnvVar];
            if( !BACKENDBLDDIR.endsWith(path.sep) ) { BACKENDBLDDIR = BACKENDBLDDIR + path.sep; } // add path sep to end if not there
            if( !BACKENDBLDDIR || !grunt.file.exists(BACKENDBLDDIR) ) {
                grunt.fail.fatal("Backend bld for trunk bld is : "
                    + BACKENDBLDDIR
                    + "\nHowever, dir does not exist or not accessible to this script."
                    + "\n(INFO: If you did not specify cmd option --"
                    + BLD_OP_BACKEND_SRC_REPO
                    + " then grunt is trying to determine the root for the backend project from the env var "
                    + xlrdirEnvVar
                    + "\nIs this set on your machine? (echo $" + xlrdirEnvVar + ")."
                    + "\nIf not, rerun Grunt and specify a backend root for your project via option: "
                    + " --" + BLD_OP_BACKEND_SRC_REPO + "=<your proj root>");
            }
        }

        // for js minification - what depth to start minification at?  defaulst to 1
        // (meaning, files at the js src get minified in to their own files,
        // and any dirs in that js src all their contents concatted together).  they want to do all in future so give 0
        JS_MINIFICATION_CONCAT_DEPTH = grunt.option(BLD_OP_JS_MINIFICATION_CONCAT_DEPTH) || 1;
        // make sure its a number
        if ( isNaN(JS_MINIFICATION_CONCAT_DEPTH) ) {
            grunt.fail.fatal("Value for js minification concat depth should be a number.  It is "
                + JS_MINIFICATION_CONCAT_DEPTH);
        }

        /**
            WATCH FUNCTIONALITY

            1. option: (for watch) - what dir to get files rel to if rel paths supplied
            2. configure list of files and dirs to watch based on user specified params,
                as well as livereload for which filetypes
                (this is in its own method)
        */
        var valueSupplied;
        if ( IS_WATCH_TASK ) {

            // --relTo : make sure valid dir
            if ( grunt.option(WATCH_OP_REL_TO) ) {
                valueSupplied = grunt.option(WATCH_OP_REL_TO);
                if ( !grunt.file.exists(valueSupplied) || !grunt.file.isDir(valueSupplied) ) {
                    grunt.fail.fatal("Error for watch cli option "
                        + WATCH_OP_REL_TO
                        + "\nThis param specifies what directory to get watch files rel to"
                        + " if rel filepaths are provided for specific files and/or dirs\n"
                        + "This value was supplied: "
                        + valueSupplied
                        + ", but this is not a directory, or does not exist");
                }
            }
            WATCH_FILES_REL_TO = grunt.option(WATCH_OP_REL_TO) || SRCROOT;
        }
    }

    /**
        One time call:
        Set all the global params used by tasks and functions, which require
        data that is gathered from cmd options (mostly SRCROOT and DESTDIR)
        as part of their values.
        Call before main tasks begin to execute.
    */
    function setGlobalsDependingOnCmdParams() {

        // variables depending on destdir and srcdir
        HTML_STAGING_I_ABS = DESTDIR + htmlStagingDirI;
        HTML_STAGING_II_ABS = DESTDIR + htmlStagingDirII;

        // common files and dirs for watch, they need abs path
        for ( var i = 0; i < COMMON_WATCH_SRC_FILES.length; i++ ) {
            COMMON_WATCH_SRC_FILES[i] = SRCROOT + COMMON_WATCH_SRC_FILES[i];
        }
        for ( var i = 0; i < COMMON_WATCH_BLD_FILES.length; i++ ) {
            COMMON_WATCH_BLD_FILES[i] = DESTDIR + COMMON_WATCH_BLD_FILES[i];
        }
        for ( var i = 0; i < COMMON_WATCH_SRC_DIRS.length; i++ ) {
            COMMON_WATCH_SRC_DIRS[i] = SRCROOT + COMMON_WATCH_SRC_DIRS[i];
        }
        for ( var i = 0; i < COMMON_WATCH_BLD_DIRS.length; i++ ) {
            COMMON_WATCH_BLD_DIRS[i] = DESTDIR + COMMON_WATCH_BLD_DIRS[i];
        }

        // globs for getting watch filetypes
        WATCH_FILE_TYPES[WATCH_FLAG_HTML_SRC] =    SRCROOT + htmlMapping.src + "**/*.html";
        WATCH_FILE_TYPES[WATCH_FLAG_HTML_BLD] = DESTDIR + htmlMapping.dest + "**/*.html";
        WATCH_FILE_TYPES[WATCH_FLAG_CSS] = DESTDIR + cssMapping.dest + "**/*.css";
        WATCH_FILE_TYPES[WATCH_FLAG_LESS] =    SRCROOT + cssMapping.src + "**/*.less";
        WATCH_FILE_TYPES[WATCH_FLAG_JS_SRC] = SRCROOT + jsMapping.src + "**/*.js";
        WATCH_FILE_TYPES[WATCH_FLAG_JS_BLD] = DESTDIR + "**/*.js";
        WATCH_FILE_TYPES[WATCH_FLAG_CONSTRUCTORS] = DESTDIR + CONSTRUCTOR_TEMPLATE_FILE_PATH_REL_BLD; // need to add in sep case for src!

    }

    /**
        set data in to grunt.config
        That is dynamic (we don't know these values before user executes script,
        because it will depend on cmd options)
        Example: template keys which need SRCROOT and DESTDIR,
        and 'files' and 'livereload' attrs of the 'watch' plugin which will
        rely on multiple cmd options

        So this needs to be called AFTER grunt.initConfig statement
    */
    function setDynamicGruntConfigAttrs() {

        /**
            Set the defaults for template keys
        */
        setTemplateKeyDefaults();

        if ( IS_WATCH_TASK ) {

            // 2. list of files and glob patterns to watch
            watchFilesList = getWatchFiles();
            grunt.log.debug("watch files: "+ watchFilesList);
            // register files list with actual 'watch' plugin
            grunt.config('watch.files', watchFilesList);

            // determine types of files to do live reload on
            reloadTypes = getReloadTypes();
            // set in global option
            grunt.config(WATCH_LIVERELOAD_HASH_CONFIG_KEY, reloadTypes);

        }
    }

    /**
        set all template key values to their defeaults within the grunt config
    */
    function setTemplateKeyDefaults() {
        var templateKey;
        for ( templateKey of Object.keys(TEMPLATE_KEYS) ) {
            grunt.log.debug("\tReset template key "
                + templateKey
                + " to default : " + TEMPLATE_KEYS[templateKey]);
            grunt.config(templateKey, TEMPLATE_KEYS[templateKey]);
        }
    }

    /**
        Validate cmd params specified by user (valid options w/ valid values)
        also verify only tasks intended to be run from cmd are requested.
        [Grunt doesn't have functionality to specify private/public tasks,
        so every task in the gruntfile will show up in grunt --help, and
        can be requested via cmd though not intended to be.)
        @TODO maybe best to use a nodejs arg parser, i just had to do this quick
        Also, the arg parser seems to be good for generating help menu,
        which grunt already has and not super useful as it displays every registered
        tasks even one meant not to call
    */
    function validateCmdParams() {

        // section :tasks
        // make sure only valid task requested.  but that they don't specify more than one bld task
        var tasksRequested = grunt.cli.tasks;
            bldTaskRequested = false; // to make sure only one bld task requested
            watchTaskRequested = false;
        var task, requires, metRequirement;

        if ( tasksRequested.length == 0 && !grunt.option('help') ) { // only exception right now is if they are running help
            grunt.fail.fatal("You have not supplied any task to run."
                + "\n(This version of the grunt file does NOT include a default task and you need to specify one.)"
                + "\nAvailable tasks and their descriptions:"
                + "\n[Build tasks:]\n"
                + BLD_TASKS_DESC_STR
                + "\n[Other tasks:]\n"
                + OTHER_TASKS_DESC_STR
                + "\n\n(NOTE: If you are seeing this error for a cli option value"
                + " and not a task,\n"
                + " make sure you are supplying your cli options with '=' syntax, i.e."
                + "\n\t\t--<option>=<value> "
                + "\nThis is required for the new version of Grunt)");
        }

        for ( task of tasksRequested ) {

            // make note if watch task so can verify later that watch flags specified only if watch task requested
            if ( task == 'watch' ) {
                watchTaskRequested = true; // save for later in validation
            }

            if ( Object.keys(VALID_TASKS).indexOf(task) !== -1 ) {
                if ( bldTaskRequested && VALID_TASKS[task][BLD_TASK_KEY] ) {
                    grunt.fail.fatal("You have supplied more than one bld task: "
                        + task + " and " + bldTaskRequested
                        + ".  Please supply only one main bld task."
                        + "\nThese are the main bld tasks, and their descriptions:\n"
                        + BLD_TASKS_DESC_STR);
                }
                else {
                    bldTaskRequested = task;
                }

                // make sure any dependencies are present
                if ( VALID_TASKS[task].hasOwnProperty(REQUIRES_ONE_KEY) ) {
                    metRequirement = false;
                    for ( requires of VALID_TASKS[task][REQUIRES_ONE_KEY] ) {
                        if ( grunt.option(requires) ) {
                            metRequirement = true;
                            break;
                        }
                    }
                    if ( !metRequirement ) {
                        grunt.fail.fatal("The task '"
                            + task
                            + "' requires at least one of the following options/flags :\n"
                            + optionListString(VALID_TASKS[task][REQUIRES_ONE_KEY]));
                    }
                }
                if ( VALID_TASKS[task].hasOwnProperty(REQUIRES_ALL_KEY) ) {
                    metRequirement = false;
                    for ( requires of VALID_TASKS[task][REQUIRES_ALL_KEY] ) {
                        if ( !grunt.option(requires) ) {
                            grunt.fail.fatal("The task '"
                                + task
                                + "' requires all of the following options/flags:\n"
                                + optionListString(VALID_TASKS[task][REQUIRES_ALL_KEY]));
                        }
                    }
                }
            }
            else {
                grunt.fail.fatal("You have supplied an invalid task:  "
                        + task
                        + "\nValid tasks:\n"
                        + "[Build tasks:] "
                        + BLD_TASKS_DESC_STR
                        + "[Other tasks:] "
                        + OTHER_TASKS_DESC_STR
                        + "\n\n(NOTE: If you are seeing this error for a cli option value"
                        + " and not a task,\n"
                        + " make sure you are supplying your cli options with '=' syntax, i.e."
                        + "\n\t\t--<option>=<value> "
                        + "\nThis is required for the new version of Grunt)");
            }

        }

        // SECTION : PARAMS

        // get list of cmd params
        params = grunt.option.flags();
        /**
            grunt.option.flags will return all the entries in grunt.option
            grunt.option also how global variables that change during
            grunt process are shared across tasks
            and we add variables to it throughout grunt process
            Therefore, make sure you are calling this function
            before adding any manual entries to grunt.option else your validation will fail
        */
        var paramIndicator = '--';
        var param, paramPlain, flagCheck, flag, values, value, requires, errMsg;
        for ( param of params ) {
            // split off the initial flag indicator
            paramPlain = param.split(paramIndicator)[1];

            // check if a flag or param option. if values supplied, get the value String
            flagCheck = paramPlain.split('=');
            paramPlain = flagCheck[0]; // flagCheck has ['param', '=val1,val2,valN']
            if ( paramPlain == 'pokacuka' ) {
                continue;
            }
            flag = false;
            if ( flagCheck.length == 1 ) {
                values = null;
                flag = true;
            }
            else {
                // this is a string of all the comma sep values, not a list
                values = flagCheck[1];
            }

            // do validation
            if ( VALID_OPTIONS.hasOwnProperty(paramPlain) ) {

                // if you can't supply in conjunction with other params, make sure they are not there
                if ( VALID_OPTIONS[paramPlain][NAND_KEY] ) {
                    var noop;
                    for ( noop of VALID_OPTIONS[paramPlain][NAND_KEY] ) {
                        if ( grunt.option(noop) ) {
                            grunt.fail.fatal("Can not supply --"
                                + paramPlain
                                + " and --"
                                + noop
                                + " simultaneously.");
                        }
                    }
                }
                // if it's a bld key, make sure bld task requested.
                if ( VALID_OPTIONS[paramPlain][BLD_KEY] && !bldTaskRequested ) {
                    grunt.fail.fatal("You have supplied a bld optaion, --"
                        + param
                        + ", but have not scheduled a bld task");
                }
                // its watch option make sure watch
                if ( VALID_OPTIONS[paramPlain][WATCH_KEY] && !watchTaskRequested ) {
                      grunt.fail.fatal("You have supplied an option for 'watch' functionality, "
                        + param
                        + ", but have not scheduled a watch task. "
                        + "\nTo watch files/dirs in the src or bld, run as "
                        + " 'grunt [options] watch [watch options]");
                }
                // if this is a flag but they specified as an option
                if ( VALID_OPTIONS[paramPlain][FLAG_KEY] && !flag ) {
                    grunt.fail.fatal("--"
                        + paramPlain
                        + " is a boolean flag, but you supplied value to it as "
                        + param
                        + "\nPlease rerun as a boolean flag."
                        + "\n(If you meant to supply an option, here are options which take values:)"
                        + OPS_DESC_STR);
                }
                // if this is an option requiring a value but they supplied as a boolean flag (could be they are used to old grunt)
                if ( VALID_OPTIONS[paramPlain][REQUIRES_VALUE_KEY] && flag ) {
                    grunt.fail.fatal("You have supplied option --"
                        + paramPlain
                        + " as a boolean flag, but it requires some value"
                        + "\n(In Grunt 1.0.1+, you should specify this option using syntax:\n\n\t--"
                        + paramPlain
                        + "=<values>"
                        + "\n\nIf you meant to supply a boolean flag, here are the valid boolean flags:"
                        + FLAGS_DESC_STR);
                }


                // validate values supplied, if any

                // get values first (if starts with '-' and its a negation param (do all but this list), remove that)
                if ( values ) {
                    if ( values.startsWith('-') && VALID_OPTIONS[paramPlain][EXCLUSION_KEY]) {
                        values = values.substring(1, values.length); // gets all but first char
                    }
                    values = values.split(OPTIONS_DELIM);
                }
                else {
                    values = [];
                }

                // if any values supplied...
                if ( values.length > 0 ) {

                    // if they supplied multiple values but no multi key for this option
                    if ( values.length > 1 && !VALID_OPTIONS[paramPlain][MULTI_KEY] ) {
                        grunt.fail.fatal("You supplied more than one value for --"
                            + paramPlain
                            + ":\n"
                            + values
                            + "\nBut this option does not allow multiple values.");
                    }

                    /**
                        if values supplied and this option limited to certain values,
                        or values of certain types,
                        make sure values supplied are valid
                    */
                    if ( VALID_OPTIONS[paramPlain].hasOwnProperty(VALUES_KEY) ) {
                        // if there are pre-defined valid values, check
                        for ( value of values ) {

                            if ( VALID_OPTIONS[paramPlain][VALUES_KEY].indexOf(value) == -1 ) {
                                errMsg = "You have supplied an invalid value, "
                                    + value
                                    + ", to option --"
                                    + paramPlain
                                    + ". Param supplied as: "
                                    + param;
                                if ( VALID_OPTIONS[paramPlain][MULTI_KEY] ) {
                                    errMsg = errMsg
                                        + "\nValid values are a '"
                                        + OPTIONS_DELIM + "' seperated list of any of the following: "
                                        + VALID_OPTIONS[paramPlain][VALUES_KEY];
                                }
                                else {
                                    errMsg = errMsg
                                        + "\nValid values are one of the following: "
                                        + VALID_OPTIONS[paramPlain][VALUES_KEY];
                                }
                                if ( VALID_OPTIONS[paramPlain][EXCLUSION_KEY] ) {
                                    errMsg = errMsg
                                        + "\n(To specify all but given values, supply option as: --"
                                        + paramPlain + "=-<value(s)>";
                                }
                                grunt.fail.fatal(errMsg);
                            }
                        }
                    }
                }

                // if supplying this option requires you supply at least one other option from a list
                if ( VALID_OPTIONS[paramPlain].hasOwnProperty(REQUIRES_ONE_KEY) ) {
                    metRequirement = false;
                    for ( requires of VALID_OPTIONS[paramPlain][REQUIRES_ONE_KEY] ) {
                        if ( grunt.option(requires) ) {
                            metRequirement = true;
                            break;
                        }
                    }
                    if ( !metRequirement ) {
                        grunt.fail.fatal("--"
                            + WATCH_OP_REL_TO
                            + " requires at least one of the following options/flags : "
                            + optionListString(VALID_OPTIONS[paramPlain][REQUIRES_ONE_KEY]));
                    }
                }
                // if supplying this option requires you supply an entire set of other options
                if ( VALID_OPTIONS[paramPlain].hasOwnProperty(REQUIRES_ALL_KEY) ) {
                    for ( requires of VALID_OPTIONS[paramPlain][REQUIRES_ALL_KEY] ) {
                        if ( !grunt.option(requires) ) {
                            grunt.fail.fatal("--"
                                + WATCH_OP_REL_TO
                                + " requires all of the following options/flags : "
                                + optionListString(VALID_OPTIONS[paramPlain][REQUIRES_ALL_KEY]));
                        }
                    }
                }
            }
            else { // not in the hash of valid options for this Gruntfile
                if ( flag ) {
                       errMsg = "You have supplied an invalid boolean flag, "
                        + param
                        + ", when invoking this Gruntfile."
                        + "  Valid flags:"
                        + FLAGS_DESC_STR;
                }
                else {
                    errMsg = "You have supplied an invalid option, "
                        + param
                        //+ paramPlain
                        + ", when invoking this Gruntfile."
                        + "\nOptions you can supply values to:"
                        + OPS_DESC_STR;
                }
                grunt.fail.fatal(errMsg);
            }
        }
    }

    /**
        a filter for prettify targets
        (it's being used in more than one target)
        return false if you shouldn't prettify this file because its name is in the blacklist
        return true if you should
    */
    function prettifyFilter(filepath) {
        var filename = path.basename(filepath);
        if( DONT_PRETTIFY.indexOf(filename) !== -1 ) {
            grunt.log.writeln((">> ").red
                + "File: "
                + filepath
                + (" skip prettifying ").red
                + ("(" + filename
                + " in prettify blacklist)").grey.bold);
               return false;
        }
        return true;
    }

    /**
        Given a list of cli string options,
        return a String which is a comma sep list
        of those options with the -- in front
        (for logging during param validation)

        i.e. optionListString(["v","t","r"]);
             returns the string "--v, --t, --r"
    */
    function optionListString(optionsList) {

        var i;
        listStr = ""
        for ( i = 0; i < optionsList.length; i++ ) {
            if ( i > 0 ) {
                listStr = listStr + ", ";
            }
            listStr = listStr + "--" + optionsList[i];
        }
        return listStr;
    }

};
