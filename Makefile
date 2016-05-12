.PHONY: all installer render build removeConfig alert generateHtml

export PATH:=$(PWD)/node_modules/.bin:$(PATH)
NOW :=$(shell date +'%Y%m%d-%H%M%S')
DESTDIR ?= .

all: generateHtml build alert

installer: generateHtml build removeConfig

render: generateHtml

$(DESTDIR):
	@mkdir -p $@

build: $(DESTDIR) generateHtml
	@echo "=== Removing old prod folder if any ==="
	@rm -rf xcalar-gui
	@rm -rf prod
	@echo "=== Creating new prod folder ==="
	@mkdir -p $(DESTDIR)/prod
	@rsync -a * $(DESTDIR)/prod --exclude prod --exclude node_modules
	@echo "=== Compile Less ==="
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/login.less > prod/assets/stylesheets/css/login.css
	cd $(DESTDIR) && lessc prod/assets/stylesheets/less/style.less > prod/assets/stylesheets/css/style.css
	@rm -rf $(DESTDIR)/prod/assets/stylesheets/less/*
	@rm -rf $(DESTDIR)/prod/assets/dev
	@echo "=== Minifying ==="
	@cd $(DESTDIR)/prod/assets/python && python getHashTags.py
	cd $(DESTDIR) && ./prod/assets/bin/MINIFY.sh
	export GIT_DIR=`pwd`/.git && cd $(DESTDIR) && ./prod/assets/bin/autoGenFiles.sh
	@echo "=== Running python build.py ==="
	@cd $(DESTDIR) && python prod/assets/python/build.py
	cd $(DESTDIR) && chmod -R 777 $(DESTDIR)/prod/*
	@echo "=== Done building ==="

removeConfig: build
	@echo "=== Autogenerating Files ==="
	touch $(DESTDIR)/prod/assets/js/config.js
	rm $(DESTDIR)/prod/assets/js/config.js
	touch $(DESTDIR)/prod/assets/js/config.js
	echo "var portNumber = 9090;" > $(DESTDIR)/prod/assets/js/config.js

alert:
	@echo "=== ALERT! ==="
	@echo "If you are part of the backend team, and you do not"
	@echo "have a custom config.js file, please RERUN with"
	@echo "make installer"

node_modules/.bin/grunt: package.json
	npm install --save-dev
	touch $@

generateHtml: node_modules/.bin/grunt
	@echo "=== Generating html ==="
	@mkdir -p assets/htmlFiles/walk
	@grunt render
