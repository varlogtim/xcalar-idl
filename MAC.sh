#!/bin/bash

echo -n "var gConstructorVersion = '" > js/constructorVersion.js
echo -n `md5 js/constructor.js | cut -d' ' -f4` >> js/constructorVersion.js
echo "';" >> js/constructorVersion.js
echo -n "var gGitVersion = '" >> js/constructorVersion.js
echo -n `git log --pretty=oneline --abbrev-commit -1 | cut -d' ' -f1` >> js/constructorVersion.js
echo "';" >> js/constructorVersion.js
