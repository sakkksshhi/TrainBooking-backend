const crypto = require("crypto");

function getDeviceFingerprint(req) {
     const userAgent = req.headers["user-agent"] || "unknown";

     return crypto
          .createHash("sha256")
          .update(userAgent)
          .digest("hex")
          .slice(0, 16); // short device id
}

module.exports = getDeviceFingerprint;