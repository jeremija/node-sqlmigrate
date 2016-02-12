export PATH := node_modules/.bin:$(PATH)
SHELL=/bin/bash

.PHONY: test
test:

	mocha test/**/*-test.js --grep="$(grep)"

.PHONY: coverage
coverage:

	istanbul cover --dir ./coverage --report text \
		node_modules/.bin/_mocha test/*-test.js

.PHONY: coverage-html
coverage-html:

	istanbul cover --dir ./coverage --report lcov \
		node_modules/.bin/_mocha test/*-test.js

.PHONY: view-coverage
view-coverage:

	open ./coverage/lcov-report/index.html
