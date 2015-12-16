#!/bin/bash

echo "var gConstructorVersion = " > js/constructorVersion.js
md5 js/constructor.js | cut -d' ' -f4 >> js/constructorVersion.js
echo ";" >> js/constructorVersion.js
