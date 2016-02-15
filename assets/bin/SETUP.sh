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

# set up apache
echo "Set up apache..."
echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/fqdn.conf && sudo a2enconf fqdn
sudo service apache2 reload

sudo cp /etc/apache2/sites-available/000-default.conf  XI.conf
sed 's,/var/www/html,/var/www/xcalar-gui,' XI.conf
sudo mv XI.conf /etc/apache2/sites-available/
sudo ln -s $XLRGUIDIR /var/www/xcalar-gui
sudo a2dissite 000-default && sudo a2ensite XI
sudo service apache2 restart
