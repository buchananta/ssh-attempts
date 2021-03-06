const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const Journalctl = require('journalctl');
const axios = require('axios');
const PORT = process.env.PORT || 5478;
const KEY = process.env.API_KEY || "";

const app = express();

app.use(cors());

// UTILITY FUNCTIONS
function date() {
  const d = new Date();
  let res = `${d.getMonth()+1}-${d.getDate()}`;
  res += (` ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
  return res;
}

function log(info) {
  console.log(`[ ${date()} ] - ${info}`);
}
function error(err) {
  console.error(`[ ${date()} ] - ERROR - ${err}`);
}

function addLocation(ip, ipObj) {
  // Grabs location from ipstack
  // and adds it to the ipObj
  axios.get(`http://api.ipstack.com/`
    + ip
    + `?access_key=${KEY}`
    + `&fields=latitude,longitude`
  )
    .then(res => {
      if (res.data.success !== false) {
        ipObj.location = res.data;
      }
      else {
        // set a invalid lat and lon to get around
        // undefined .location making infinite requests
        // and probably angering the api people
        log("Forced to set invalid location for " + ip);
        ipObj.location = { latitude: 91, longitude: 181 } 
      }
    })
    .catch(err => {
      error(err);
    })
}

function removeOld(ipObj) {
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  // filter out stuff older than one day
  const filtered = Object.keys(ipObj).filter(ip => {
    return ipObj[ip].latestAttempt / 1000 > yesterday;
  })
  // turn array back into an object
  const newIpObj = filtered.reduce((obj, ip) => {
    return { ...obj, [ip]: ipObj[ip] };
  }, {});
  return newIpObj;
}

// SETUP ENDPOINT
//app.listen(PORT, () => {
//  log(`listening on port ${PORT}`);
//});

app.get('/', (req, res) => {
    log(`request ${req.query} recieved!`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(ipAndData));
});

// ADD HTTPS ENDPOINT
const options = {
  key: fs.readFileSync(CERT_KEY),
  cert: fs.readFileSync(CERT)
};

https.createServer(options, app).listen(PORT, () => {
  log(`listening on port ${PORT}`);
});


// MONITOR LOG AND CREATE `ipAndData` OBJECT
const journalctl = new Journalctl({unit: "ssh", since: "1 hour ago"});
let ipAndData = {};
journalctl.on('event', (event) => {
  // only work with events that contain 'disconnect' in the message
  // as well as 'authenticating' or 'invalid'
  if (event.MESSAGE.match(/disconnect.*(authenticating|invalid).*/gi)) {
    const ipRegex = /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g;
    let ip = event.MESSAGE.match(ipRegex);
    if (ip) {
      // possible the 'name' field is a valid ip address
      // so this ensures we get the actual ip
      ip = ip[ip.length -1];
      if (ipAndData[ip] == undefined) {
        ipAndData[ip] = {};
      }
      if (ipAndData[ip].location == undefined) {
        addLocation(ip, ipAndData[ip]);
      }
      if (ipAndData[ip].count == undefined) {
        ipAndData[ip].count = 0;
      }
      ipAndData[ip].latestAttempt = event.__REALTIME_TIMESTAMP,
      ipAndData[ip].count += 1;
      if (Date.now() - (ipAndData[ip].latestAttempt / 1000) < 60000 ) {
        log(`new IP: ${ip}`);
      }
      ipAndData = removeOld(ipAndData);
    }
  }
})
