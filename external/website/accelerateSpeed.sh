curl -o js/webfont.js "https://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js"
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/ajax.googleapis.com\/ajax\/libs\/webfont\/1.4.7\/webfont.js/\/js\/webfont.js/g' {} \;
curl -o js/analytics.js "https://www.google-analytics.com/analytics.js"
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/www.google-analytics.com\/analytics.js/\/js\/analytics.js/g' {} \;
curl -o js/jquery.min.js "https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js"
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/ajax.googleapis.com\/ajax\/libs\/jquery\/2.2.0\/jquery.min.js/\/js\/jquery.min.js/g' {} \;
curl -o css/font-awesome.min.css "https://maxcdn.bootstrapcdn.com/font-awesome/4.6.1/css/font-awesome.min.css"
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/maxcdn.bootstrapcdn.com\/font-awesome\/4.6.1\/css\/font-awesome.min.css/\/css\/font-awesome.min.css/g' {} \;

# npm install -g minifier
cd js
mv xcalar.js xcalar2.js
minify xcalar2.js
minify webfont.js
cat webfont.min.js jquery.min.js xcalar2.min.js > xcalar.js
minify xcalar.js
rm xcalar2.js
rm webfont.js
rm webfont.min.js
rm jquery.min.js
rm xcalar2.min.js
rm xcalar.js
mv xcalar.min.js xcalar.js
cd ..

cd css
mv xcalar.css xcalar2.css
minify components.css
minify normalize.css
minify xcalar2.css
cat components.min.css normalize.min.css font-awesome.min.css xcalar2.min.css > xcalar.css
minify xcalar.css
rm xcalar.css
rm components.css
rm components.min.css
rm normalize.css
rm normalize.min.css
rm font-awesome.min.css
rm xcalar2.css 
rm xcalar2.min.css
mv xcalar.min.css xcalar.css
cd ..

find . -type f -name "*.html" -exec sed -i'' -e 's/js\/xcalar.js/\/ /g' {} \;
# The first js script on each html page
find . -type f -name "*.html" -exec sed -i'' -e 's/\/js\/webfont.js/\/js\/xcalar.js/g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/\/js\/jquery.min.js/ /g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/css\/components.css/ /g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/css\/normalize.css/ /g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/\/css\/font-awesome.min.css/ /g' {} \;

# mkdir videos;
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/daks2k3a4ib2z.cloudfront.net\/570e5bb122afb3312d40f25a\/590ccabfe28e0269bf2de9ba_Xcalar Final Video2-poster-00001.jpg/.\/videos\/Video2-poster-00001.jpg/g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/daks2k3a4ib2z.cloudfront.net\/570e5bb122afb3312d40f25a\/590ccabfe28e0269bf2de9ba_Xcalar Final Video2-transcode.webm/.\/videos\/Video2-transcode.webm/g' {} \;
find . -type f -name "*.html" -exec sed -i'' -e 's/https:\/\/daks2k3a4ib2z.cloudfront.net\/570e5bb122afb3312d40f25a\/590ccabfe28e0269bf2de9ba_Xcalar Final Video2-transcode.mp4/.\/videos\/Video2-transcode.mp4/g' {} \;
timestamp=$( date +%T )
find . -type f -name "*.html" -exec sed -i'' -e "s/xcalar.css/xcalar.css?v=$timestamp/g" {} \;
find . -type f -name "*.html" -exec sed -i'' -e "s/xcalar.js/xcalar.js?v=$timestamp/g" {} \;
# Required you to install Mac ports first (for mac users) from https://www.macports.org/install.php
#sudo port install ImageMagick
find . -type f -name '*.html-e' -delete
cd images
mogrify *.jpg -quality 85 -sampling-factor 4:2:0 *.jpg
mogrify *.png -quality 85 -sampling-factor 4:2:0 *.png