JSFILES=`find prod/assets/js -not -path "../../3rd" -name "*.js"`
OS=`uname`
echo $OS
for f in $JSFILES;
do
	short=${f%.js};
    if [ "${OS}" = "Darwin" ]; then
	    ./prod/3rd/bower_components/uglify-js/bin/uglifyjs $f > $short.min.js
	else
        uglifyjs $f > $short.min.js
    fi
    mv $short.min.js $f
    echo $f
done
