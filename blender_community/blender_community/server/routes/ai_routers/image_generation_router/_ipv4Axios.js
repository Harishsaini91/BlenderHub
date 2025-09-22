const axios = require("axios");
const https = require("https");
const dns = require("dns");

const ipv4Lookup = (hostname, options, cb) =>
  dns.lookup(hostname, { family: 4, all: false }, cb);

const httpsAgent = new https.Agent({ keepAlive: true, lookup: ipv4Lookup });

const ipv4Axios = axios.create({
  httpsAgent,
  timeout: 60_000
});

module.exports = ipv4Axios;
