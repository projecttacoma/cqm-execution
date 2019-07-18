sed -i -e "s/case \'Date\'/case 'MongooseDate'/g" ./dist/browser.js
sed -i -e "s/'Date' === obj\.constructor\.name/'MongooseDate' === obj\.constructor\.name/g" ./dist/browser.js
