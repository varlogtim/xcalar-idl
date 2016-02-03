find js -name *.min.js | xargs rm
JSFILES=`find js -not -path "js/thrift/*" -name "*.js"`

for f in $JSFILES;
do
	short=${f%.js};
	./bower_components/uglify-js/bin/uglifyjs $f > $short.min.js;
	mv $short.min.js $f
done