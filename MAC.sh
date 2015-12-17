#!/bin/bash

echo -n "var gConstructorVersion = '" > js/constructorVersion.js
echo -n `md5 js/constructor.js | cut -d' ' -f4` >> js/constructorVersion.js
echo -n "';" >> js/constructorVersion.js
