// loadEnv.js
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'prod' ? '.env.production' : '.env.development';
const envPath = path.resolve(__dirname, envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment variables from ${envFile}`);
} else {
  console.error(`Environment file ${envFile} not found`);
  process.exit(1);
}