#!/bin/sh
./node_modules/.bin/eslint "src/**/*.ts" > current_lint.txt 2>&1
