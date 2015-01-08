.PHONY: all
all: style runme

.PHONY: style
style:
	lessc stylesheets/less/style.less > stylesheets/css/style.css

.PHONY: runme
runme:
	./RUNME.sh
