#!/bin/bash

yarn run browser

if git diff-index --quiet HEAD --; then
  echo "dist/browser.js is up to date"
  exit 0
else
  echo "dist/browser.js is out of date. Please run 'yarn run browser' locally and commit/push the result"
  exit 1
fi

