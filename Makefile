.PHONY: all
all: build

.PHONY: build
build:
	@echo "=== Removing old prod folder if any ===" 
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
	@echo "=== Autogenerating Files ==="
	./prod/assets/bin/autoGenFiles.sh
	@echo "=== Running python build.py ==="
	@python assets/python/build.py
	@echo "=== Done building ==="
