if (process.argv.length < 3) {
  console.log('usage: node theraTripCheck.js <start system> [end system] [end system] [end system]')
  process.exit(1);
}

const start = formatSystem(process.argv[2]);
var startSystem;
var destos = [];
const marketHubs = ['Jita', 'Amarr', 'Dodixie']; // list of trade hubs

const EVEoj = require('EVEoj');
var SDD = EVEoj.SDD.Create('json', {path: 'staticevedata'});
var map;
SDD.LoadMeta().then(function() {
  map = EVEoj.map.Create(SDD, 'K');
  return map.Load();
}).then(function() { // handle bogus system names
  startSystem = map.GetSystem({name: start});
  if (startSystem == null) {
    console.log('error: ' + start + ' is not a recognized system.');
    process.exit(1);
  }

  if (process.argv.length > 3) {
    var end = Math.min(process.argv.length, 6); // limited to 3 desto systems because of performance
    for (var i = 3; i < end; i++) {
      var curr = formatSystem(process.argv[i]);
      var currSystem = map.GetSystem({name: curr});
      if (currSystem == null) {
        console.log('error: ' + curr + ' is not a recognized system.');
        process.exit(1);
      }
      destos.push(curr);
    }
  } else {
    destos = marketHubs;
  }
  console.log('thera-trip-check: running check for system ' + start);
});

const http = require('http');
const https = require('https');

const theraSystem = {ID: 31000005, name: 'Thera'} // Object representing Thera (for code readability)

const req = https.get('https://www.eve-scout.com/api/wormholes', (res) => {
  res.setEncoding('utf8');

  var evescoutjson = '';
  res.on('data', (chunk) => {
    evescoutjson += chunk;
  });
  res.on('end', () => {
    getJumps(evescoutjson)
  });
});

function getJumps(evescoutjson) {
  var theraholes = JSON.parse(evescoutjson);
  var startSystem = map.GetSystem({name: start});

  // calc shortest path from start to thera
  var minjumps = Infinity;
  var closestEntryInfo;
  var shortestPreRoute;
  for (var entry of theraholes) {
    var theraConnection = entry.destinationSolarSystem;

    var route = map.Route(startSystem.ID, theraConnection.id, [], false, false);
    if (route.length < minjumps && (route != 0 || startSystem.ID == theraConnection.id)) {
      minjumps = route.length;
      closestEntryInfo = entry;
      shortestPreRoute = route;
    }
  }
  console.log('\nclosest Thera connection to start: ' + closestEntryInfo.destinationSolarSystem.name + ' | jumps: ' + shortestPreRoute.length);

  // calc shortest path from thera to each of the destos
  destos.forEach((desto) => {
    console.log('\nchecking route to ' + desto)
    var destoSystem = map.GetSystem({name: desto});

    var shortestKSpaceRoute = map.Route(startSystem.ID, destoSystem.ID, [], false, false);
    console.log('shortest k-space route to ' + desto + ': ' + shortestKSpaceRoute.length + ' jumps');

    var minjumps = Infinity;
    var closestExitInfo;
    var shortestPostRoute;
    for (var entry of theraholes) {
      var theraConnection = entry.destinationSolarSystem;

      var route = map.Route(theraConnection.id, destoSystem.ID, [], false, false);
      if (route.length < minjumps && (route.length != 0 || theraConnection.id == destoSystem.ID)) {
        minjumps = route.length;
        closestExitInfo = entry;
        shortestPostRoute = route;
      }
    }
    console.log('closest Thera connection to ' + desto + ': ' + closestExitInfo.destinationSolarSystem.name + ' | jumps: ' + shortestPostRoute.length);
    console.log('shortest route length via Thera to ' + desto + ': ' + (shortestPreRoute.length + 2 + shortestPostRoute.length) + ' jumps');

    var composedRoute = [{
      id: startSystem.ID,
      name: start,
      kills: [],
      security: map.GetSystem({id: startSystem.ID}).security
    }];
    shortestPreRoute.forEach((systemid) => {
      var sysObj = map.GetSystem({id: systemid});
      composedRoute.push({
        id: systemid,
        name: sysObj.name,
        kills: [],
        security: sysObj.security
      });
    });
    composedRoute.push({
      id: theraSystem.ID,
      name: theraSystem.name,
      kills: [],
      inSig: closestEntryInfo.wormholeDestinationSignatureId,
      outSig: closestExitInfo.signatureId
    });
    composedRoute.push({
      id: closestExitInfo.destinationSolarSystem.id,
      name: closestExitInfo.destinationSolarSystem.name,
      kills: [],
      security: map.GetSystem({id: closestExitInfo.destinationSolarSystem.id}).security
    });
    shortestPostRoute.forEach((systemid) => {
      var sysObj = map.GetSystem({id: systemid});
      composedRoute.push({
        id: systemid,
        name: sysObj.name,
        kills: [],
        security: sysObj.security
      });
    });

    var completed_requests = 0;
    var totalkills = 0;
    composedRoute.forEach((obj) => {
      // get kills for given system within the past hour
      const req = https.get('https://www.zkillboard.com/api/kills/solarSystemID/' +
        obj.id + '/pastSeconds/3600/',
        (res) => {
          res.setEncoding('utf8');

          var zkilljson = '';
          res.on('data', (chunk) => {
            zkilljson += chunk;
          });
          res.on('end', () => {
            obj.kills = JSON.parse(zkilljson);
            totalkills += obj.kills.length;
            completed_requests++;
            if (completed_requests == composedRoute.length) {
              console.log('\nsuggested Thera route from ' + start + ' to ' + desto +
                ': ' + (composedRoute.length - 1) + ' jumps | total kills in last hour: ' + totalkills)

              // var lastRegion;
              var lastSec;
              composedRoute.forEach((obj) => {
                if (obj.name != 'Thera') {
                  var infoStr = obj.name;
                  var currSec = getSec(obj.security);
                  if (currSec != lastSec) {
                    infoStr += ' | ' + currSec
                    lastSec = currSec;
                  }
                  console.log((obj.kills.length < 1) ? infoStr :
                  (infoStr + ' | kills: ' + obj.kills.length));
                } else {
                  var infoStr = obj.name + ' (in sig: ' + obj.inSig + ' | out sig: ' + obj.outSig + ')';
                  console.log((obj.kills.length < 1) ? infoStr :
                  (infoStr + ' | kills: ' + obj.kills.length));
                }
              });
            }
          });
        });
    });
  });
}

function formatSystem(name) {
  if (name.indexOf('-') > -1 || /\d/.test(name)) { // nullsec-ish
    return name.toUpperCase();
  }
  return name[0].toUpperCase() + name.slice(1);
}

function getSec(sec) {
  if (sec <= 0) {
    return 'Nullsec';
  }
  if (sec < 0.5) {
    return 'Lowsec';
  }
  return 'Highsec';
}