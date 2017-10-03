.PHONY: all installer render build prod debug removeConfig alert generateHtml

export PATH:=$(PWD)/node_modules/.bin:$(PATH)
NOW :=$(shell date +'%Y%m%d-%H%M%S')
DESTDIR ?= .

ifeq ($(XLRDIR),)
$(error "XLRDIR is not set! Bailing...")
endif
ifeq ($(XLRGUIDIR),)
$(error "XLRGUIDIR is not set! Bailing...")
endif

product=XD
PRODUCTNAME=xcalar-design
ifeq ($(product),XI)
PRODUCTNAME=xcalar-insight
endif
#export PRODUCTNAME=$(PRODUCTNAME)

all: generateHtml build prod alert

installer: generateHtml build prod removeConfig

trunk: generateHtml removeConfig thriftSync thriftAlert

debug: generateHtml build debug removeConfig

render: generateHtml

$(DESTDIR):
	@mkdir -p $@

build: $(DESTDIR) generateHtml
	@echo "=== Removing old prod folder if any ==="
	@rm -rf xcalar-gui
	@rm -rf $(PRODUCTNAME)
	@rm -rf prod
	@echo "=== Creating new prod folder ==="
	@mkdir -p $(DESTDIR)/$(PRODUCTNAME)
	@rsync -a * $(DESTDIR)/$(PRODUCTNAME) --exclude prod --exclude xcalar-design --exclude xcalar-insight --exclude node_modules --exclude internal --exclude assets/js/constructor/xcalar-idl
	@echo "=== Removing unused files ==="
	@rm -f $(DESTDIR)/$(PRODUCTNAME)/assets/js/thrift/mgmttestactual.js
	@echo "=== Compile Less ==="
	cd $(DESTDIR) && mkdir -p $(PRODUCTNAME)/assets/stylesheets/css
	cd $(DESTDIR) && lessc $(PRODUCTNAME)/assets/stylesheets/less/login.less > $(PRODUCTNAME)/assets/stylesheets/css/login.css
	cd $(DESTDIR) && lessc $(PRODUCTNAME)/assets/stylesheets/less/style.less > $(PRODUCTNAME)/assets/stylesheets/css/style.css
	cd $(DESTDIR) && lessc $(PRODUCTNAME)/assets/stylesheets/less/mcf.less > $(PRODUCTNAME)/assets/stylesheets/css/mcf.css
	cd $(DESTDIR) && lessc $(PRODUCTNAME)/assets/stylesheets/less/testSuite.less > $(PRODUCTNAME)/assets/stylesheets/css/testSuite.css
	cd $(DESTDIR) && lessc $(PRODUCTNAME)/assets/stylesheets/less/installer.less > $(PRODUCTNAME)/assets/stylesheets/css/installer.css
	@rm -rf $(DESTDIR)/$(PRODUCTNAME)/assets/stylesheets/less
	@echo "=== Cleaning up non prod stuff ==="
	@rm -rf $(DESTDIR)/$(PRODUCTNAME)/assets/dev
	@rm -f $(DESTDIR)/$(PRODUCTNAME)/services/expServer/awsWriteConfig.json
	@echo "=== Generating version files ==="
	@echo "var gGitVersion = '"`git log --pretty=oneline --abbrev-commit -1 | cut -d' ' -f1`"';" >> $(PRODUCTNAME)/assets/js/constructor/A_constructorVersion.js
	@cd $(DESTDIR)/$(PRODUCTNAME)/assets/python && python genHelpAnchors.py
	export GIT_DIR=`pwd`/.git && cd $(DESTDIR)/$(PRODUCTNAME) && ./assets/bin/autoGenFiles.sh

prod: $(DESTDIR) generateHtml build
	@echo "=== Minifying ==="
	cd $(DESTDIR)/$(PRODUCTNAME) && ./assets/bin/minify.sh
	@echo "=== Running python build.py ==="
	@cd $(DESTDIR)/$(PRODUCTNAME) && python assets/python/build.py

	cd $(DESTDIR) && chmod -R 777 $(DESTDIR)/$(PRODUCTNAME)/*
	@echo "=== Done building ==="

debug: $(DESTDIR) generateHtml build
	@echo "=== Running python debug build.py ==="
	@cd $(DESTDIR)/$(PRODUCTNAME) && python assets/python/build.py debug

	cd $(DESTDIR) && chmod -R 777 $(DESTDIR)/$(PRODUCTNAME)/*
	@echo "=== Done building ==="

removeConfig: build
	@echo "=== Autogenerating Files ==="
	touch $(DESTDIR)/$(PRODUCTNAME)/assets/js/config.js
	rm $(DESTDIR)/$(PRODUCTNAME)/assets/js/config.js
	touch $(DESTDIR)/$(PRODUCTNAME)/assets/js/config.js

alert:
	@echo "=== ALERT! ==="
	@echo "If you are part of the backend team, and you do not"
	@echo "have a custom config.js file, please RERUN with"
	@echo "make installer"

node_modules:
	mkdir -p $@

node_modules/.bin: node_modules
	mkdir -p $@
	npm install --save-dev

node_modules/.bin/grunt: node_modules/.bin
	touch $@

generateHtml: node_modules/.bin/grunt
	@echo "=== Generating html ==="
	@mkdir -p assets/htmlFiles/walk
	grunt render$(product)


thriftSync: $(XLRDIR)/src/bin/thrift/js/XcalarApiService.js
	@echo "=== Syncing with XLRDIR's .js files ==="
	@./assets/bin/syncTrunk.sh
	@echo "var hostname='http://`hostname`:9090'; var expHost='http://`hostname`:12124';" > $(DESTDIR)/$(PRODUCTNAME)/assets/js/config.js


thriftAlert:
	@echo "=== ALERT! ==="
	@echo "You just forced the UI to talk to trunk."
	@echo "This may cause features to break if there are thrift changes "
	@echo "that are not yet incorporated into the front end. "
	@echo "If something that you expect to work breaks, "
	@echo "please send an email to fs-core@xcalar.com"
