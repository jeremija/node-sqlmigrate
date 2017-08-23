export PATH := node_modules/.bin:$(PATH)
SHELL=/bin/bash

.PHONY: test
test:

	mocha --recursive test/ --grep="$(grep)"

.PHONY: lint

	eslint .

.PHONY: coverage
coverage:

	istanbul cover --dir ./coverage --report text \
		node_modules/.bin/_mocha --recursive test/

.PHONY: coverage-html
coverage-html:

	istanbul cover --dir ./coverage --report lcov \
		node_modules/.bin/_mocha --recursive test/

.PHONY: view-coverage
view-coverage:

	open ./coverage/lcov-report/index.html

.PHONY: ci
ci: lint coverage
