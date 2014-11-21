#! /bin/bash

# Get rid of abs paths 
sed -i 's/\/js\//js\//' index.html
sed -i 's/\/stylesheets\//stylesheets\//' index.html
sed -i 's/\/images\//images\//' stylesheets/css/style.css
# to test the pages, simply open up test/index.html
