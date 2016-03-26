.PHONY: all
all: generateHtml build alert

installer: generateHtml build removeConfig

render: generateHtml

.PHONY: build
build:
	@echo "=== Removing old prod folder if any ===" 
	@rm -rf xcalar-gui
	@rm -rf prod
	@echo "=== Creating new prod folder ==="
	@mkdir prod
	@rsync -a * prod --exclude prod
	@echo "=== Compile Less ==="
	lessc prod/assets/stylesheets/less/login.less > prod/assets/stylesheets/css/login.css
	lessc prod/assets/stylesheets/less/style.less > prod/assets/stylesheets/css/style.css
	@rm -rf prod/assets/stylesheets/less/*
	@echo "=== Minifying ==="
	./prod/assets/bin/MINIFY.sh
	./prod/assets/bin/autoGenFiles.sh
	@echo "=== Running python build.py ==="
	@python assets/python/build.py
	chmod -R 777 prod/*
	@echo "=== Done building ==="

removeConfig:
	@echo "=== Autogenerating Files ==="
	touch prod/assets/js/config.js
	rm prod/assets/js/config.js
	touch prod/assets/js/config.js
	echo "var portNumber = 9090;" > prod/assets/js/config.js
	
alert:
	@echo "=== ALERT! ==="
	@echo "If you are part of the backend team, and you do not"
	@echo "have a custom config.js file, please RERUN with"
	@echo "make installer"

generateHtml:
	@echo "=== Generating html ==="
	@mkdir -p assets/htmlFiles/walk
	@grunt render