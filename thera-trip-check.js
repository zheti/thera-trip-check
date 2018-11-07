if (process.argv.length < 3) {
  console.log('usage: theraTripCheck.js [start system]')
  process.exit(1);
}

const start = process.argv[2].toUpperCase();
console.log('thera-trip-check: running check for system ' + start);
var startSystem;

const EVEoj = require('EVEoj');
var SDD = EVEoj.SDD.Create('json', {path: 'staticevedata'});
var map;
SDD.LoadMeta().then(function() {
  map = EVEoj.map.Create(SDD, 'K');
  return map.Load();
}).then(function() { // handle bogus system name
  startSystem = map.GetSystem({name: start});
  if (startSystem == null) {
    console.log('error: ' + start + ' is not a recognized system.');
    process.exit(1);
  }
});

const http = require('http');
const https = require('https');

const theraSystem = {ID: 31000005, name: 'Thera'} // Object representing Thera (for code readability)
const hubs = ['Jita', 'Amarr', 'Dodixie']; // list of trade hubs

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
  var closestPreConnection;
  var shortestPreRoute;
  for (var entry of theraholes) {
    var theraConnection = entry.destinationSolarSystem;

    var route = map.Route(startSystem.ID, theraConnection.id, [], false, false);
    if (route.length < minjumps && (route != 0 || startSystem.ID == theraConnection.id)) {
      minjumps = route.length;
      closestPreConnection = theraConnection;
      shortestPreRoute = route;
    }
  }
  console.log('\nclosest Thera connection to start: ' + closestPreConnection.name + ' | jumps: ' + shortestPreRoute.length);

  // calc shortest path from thera to each of the hubs
  hubs.forEach((hub) => {
    console.log('\nchecking route to ' + hub)
    var hubSystem = map.GetSystem({name: hub});

    var shortestKSpaceRoute = map.Route(startSystem.ID, hubSystem.ID, [], false, false);
    console.log('shortest k-space route to ' + hub + ': ' + shortestKSpaceRoute.length + ' jumps');

    var minjumps = Infinity;
    var closestPostConnection;
    var shortestPostRoute;
    for (var entry of theraholes) {
      var theraConnection = entry.destinationSolarSystem;

      var route = map.Route(theraConnection.id, hubSystem.ID, [], false, false);
      if (route.length < minjumps && (route.length != 0 || theraConnection.id == hubSystem.ID)) {
        minjumps = route.length;
        closestPostConnection = theraConnection;
        shortestPostRoute = route;
      }
    }
    console.log('closest Thera connection to ' + hub + ': ' + closestPostConnection.name + ' | jumps: ' + shortestPostRoute.length);
    console.log('shortest route length via Thera to ' + hub + ': ' + (shortestPreRoute.length + 2 + shortestPostRoute.length) + ' jumps');

    var composedRoute = [{
      id: startSystem.ID,
      name: start,
      kills: []
    }];
    shortestPreRoute.forEach((systemid) => {
      composedRoute.push({
        id: systemid,
        name: map.GetSystem({id: systemid}).name,
        kills: []
      });
    });
    composedRoute.push({
      id: theraSystem.ID,
      name: theraSystem.name,
      kills: []
    });
    composedRoute.push({
      id: closestPostConnection.id,
      name: closestPostConnection.name,
      kills: []
    });
    shortestPostRoute.forEach((systemid) => {
      composedRoute.push({
        id: systemid,
        name: map.GetSystem({id: systemid}).name,
        kills: []
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
              console.log('\nsuggested Thera route from ' + start + ' to ' + hub +
                ': ' + (composedRoute.length - 1) + ' jumps | total kills in last hour: ' + totalkills)
              composedRoute.forEach((obj) => {
                console.log((obj.kills.length < 1) ? obj.name :
                  (obj.name + ' | kills: ' + obj.kills.length));
              });
            }
          });
        });
    });
  });
}