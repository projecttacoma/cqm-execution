#!/bin/bash

mkdir -p tmp/dist/

# browser_test browserifies index.js to tmp/dist
yarn run browser_test

# Repeat the fix-mongoose.sh changes on the temp browser
sed -i -e "s/case \'Date\'/case 'MongooseDate'/g" ./tmp/dist/browser.js
sed -i -e "s/'Date' === obj\.constructor\.name/'MongooseDate' === obj\.constructor\.name/g" ./tmp/dist/browser.js

# comm -3 only returns lines that differ between the two files. If none are different, diff will be empty
diff=`diff dist/browser.js tmp/dist/browser.js`

# Exit with a non-zero code if the diff isn't empty
if [ "$diff" != "" ]; then
  echo "dist/browser.js is out of date. Please run 'yarn run browser' locally and commit/push the result"
  exit 1
fi

echo "dist/browser.js is up to date"
