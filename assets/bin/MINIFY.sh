JSFILES=`find prod/assets/js -not -path "../../3rd" -name "*.js"`

for f in $JSFILES;
do
	short=${f%.js};
	./prod/3rd/bower_components/uglify-js/bin/uglifyjs $f > $short.min.js
	mv $short.min.js $f
    echo $f
done
