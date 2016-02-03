#!/bin/bash
VERSION="0.1.2"

sed -i "" "s/Version [0-9]*.[0-9]*.[0-9]/Version $VERSION/" index.html

