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
      ipObj.location = res.data;
    })
    .catch(err => {
      error(err);
    })
}

// SETUP ENDPOINT
app.listen(PORT, () => {
  log(`listening on port ${PORT}`);
});

app.get('/', (req, res) => {
    log(`request ${req.query} recieved!`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(ipAndData));
});

// MONITOR LOG AND CREATE `ipAndData` OBJECT
const journalctl = new Journalctl({unit: "ssh", since: "1 hour ago"});
let ipAndData = {};
journalctl.on('event', (event) => {
  // only work with events that contain 'disconnect' in the message
  // as well as 'authenticating' or 'invalid'
  if (event.MESSAGE.match(/disconnect.*[authenticating,invalid]/gi)) {
    const ipRegex = /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g;
    let ip = event.MESSAGE.match(ipRegex);
    if (ip) {
      // possible the 'name' is a valid ip address
      // so this ensures we get the actual ip
      ip = ip[ip.length -1];
      ipAndData[ip] = {
        latestAttempt: event.SYSLOG_TIMESTAMP,
      }
      if (!ipAndData[ip].location) {
         addLocation(ip, ipAndData[ip]);
      }
      if (Date.now() - (event.__REALTIME_TIMESTAMP / 1000) < 60000 ) {
        log(`new IP: ${ip}`);
      }
    }
  }
})
