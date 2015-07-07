#!/bin/bash
HOST=localhost
PORT=9090
echo "Start Xcalar Insight Configuration..."
echo "Install necessary package..."
# install less if not exist
if [ ! -e /usr/bin/lessc ]
then
    echo "do not have less, install less..."
    sudo apt-get update && sudo apt-get install node-less
fi

# install apache if not exist
if [ ! -e /etc/apache2 ]
then
    echo "do not have apache2, install apache2..."
    sudo apt-get update && sudo apt-get install apache2
fi

# set up xcalar file
echo "Set up Xcalar Insight..."
# Get rid of abs paths 
sed -i '/^<script src="bower/! s@/js/@js/@' *.html
sed -i 's@/stylesheets/@stylesheets/@' *.html
sed -i '/^<script src="bower/! s@/js/@js/@' widget/*.html
sed -i 's@/stylesheets/@stylesheets/@' widget/*.html
lessc stylesheets/less/style.less > stylesheets/css/style.css
lessc stylesheets/less/login.less > stylesheets/css/login.css
lessc widget/widget.less > widget/widget.css
sed -i 's@/images/@\.\./\.\./images/@' stylesheets/css/*.css
sed -i 's@/images/@\.\./\.\./images/@' widget/*.css

if [ -e "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ]
then
    diff -q "../xcalar/src/bin/tests/XcalarApiVersionSignature_types.js" ./js/thrift/XcalarApiVersionSignature_types.js > /dev/null 2>&1
    ret=$?
    if [ "$ret" != "0" ]
    then
        echo "*** WARNING: thrift interfaces may be incompatible"
        echo "XcalarApiVersionSignature_types.js differs"
    fi
    diff -q "../xcalar/src/lib/libapis/XcalarApi.js" ./js/thrift/XcalarApi.js > /dev/null 2>&1
    ret=$?
    if [ "$ret" != "0" ]
    then
        echo "*** WARNING: thrift interfaces may be incompatible"
        echo "XcalarApi.js differs"
    fi
fi

# set up config.js
cp js/sample-config.js js/config.js
sed -i "s/<yourHostName>/$HOST/" js/config.js
sed -i "s/9090/$PORT/" js/config.js
cat js/config.js

# set up apache
echo "Set up apache..."
echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/fqdn.conf && sudo a2enconf fqdn
sudo service apache2 reload

sudo cp /etc/apache2/sites-available/000-default.conf  XI.conf
sed -i 's,/var/www/html,/var/www/xcalar-gui/,' XI.conf
sudo mv XI.conf /etc/apache2/sites-available/
sudo ln -s ~/xcalar-gui /var/www/xcalar-gui
sudo a2dissite 000-default && sudo a2ensite XI
sudo service apache2 restart
