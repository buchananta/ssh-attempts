
const express = require('express');
const Journalctl = require('journalctl');

const PORT = process.env.PORT || 5478;
const KEY = process.env.API_KEY || "";

const app = express();

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

app.listen(PORT, () => {
  log(`listening on port ${PORT}`);
});

app.get('/', (req, res) => {
    log(`request ${req.query} recieved!`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(ipAndTime));
});


// grap ip addresses as they show up in journalctl and log them with timestamps
const journalctl = new Journalctl({unit:"ssh"});
let ipAndTime = {};
journalctl.on('event', (event) => {
  // only work with events that contain 'disconnect' in the message.
  if (event.MESSAGE.match(/disconnect/gi)) {
    const ipRegex = /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g;
    let ip = event.MESSAGE.match(ipRegex);
    if (ip) {
      log(`new IP: ${ip}`);
      ipAndTime[ip.pop()] = event.SYSLOG_TIMESTAMP;
    }
  }
})
