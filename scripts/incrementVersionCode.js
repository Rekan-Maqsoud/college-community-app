const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');

function incrementVersionCode() {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  if (!appJson.expo) {
    throw new Error('expo key not found in app.json');
  }
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  const current = appJson.expo.android.versionCode || 1;
  appJson.expo.android.versionCode = current + 1;
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`Android versionCode incremented to ${appJson.expo.android.versionCode}`);
}

incrementVersionCode();
