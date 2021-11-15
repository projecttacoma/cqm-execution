sed -i -e "s/case \'Date\'/case 'MongooseDate'/g" ./dist/browser.js
sed -i -e "s/'Date' === obj\.constructor\.name/'MongooseDate' === obj\.constructor\.name/g" ./dist/browser.js
sed -i -e "s/process\.versions\.node/'v16.13.0'/g" ./dist/browser.js