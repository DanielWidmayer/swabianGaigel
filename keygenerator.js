const crypto = require('crypto');

// generate a random 16 byte long hex string
var session_secret = crypto.randomBytes(16).toString('hex');
console.log("  session_secret: \t\t" + session_secret);

// generate a random 32 byte long key and encode in Base64
var enc_key = crypto.randomBytes(32).toString('base64');
console.log("  encryption_key: \t\t" + enc_key);

// optional: generate 8 Byte long _URL-Safe_ Password for MongoDB
var db_password = crypto.randomBytes(8).toString('hex');
console.log("  opt. MongoDB-Password: \t" + db_password);