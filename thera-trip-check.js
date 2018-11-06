if (process.argv.length < 3) {
  // TODO: system avoidance
  // TODO: choice of checking hubs or input system
  // TODO: debug mode
  console.log('usage: theraTripCheck.js [start system]')
  process.exit(1);
}

const start = process.argv[2].toUpperCase();
console.log('theraTripCheck: running check for system ' + start);
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

const theraSystem = {ID: 31000005, name: 'Thera'} // Object representing Thera
const hubs = ['Jita', 'Amarr', 'Dodixie']; // list of trade hubs

const req = https.get('https://www.eve-scout.com/api/wormholes', (res) => {
  // console.log(`STATUS: ${res.statusCode}`);
  // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');

  var evescoutjson = '';
  res.on('data', (chunk) => {
    evescoutjson += chunk;
  });
  res.on('end', () => {
    // routeStuff(evescoutjson);
    getJumps(evescoutjson)
  }
    // getJumps(evescoutjson) // TODO; why doesn't this work?
  );
});

function getJumps(evescoutjson) { // TODO: jump off-by-1 because of thera jump
  // console.log('calculating with ' +  evescoutjson)

  var theraholes = JSON.parse(evescoutjson);
  var startSystem = map.GetSystem({name: start});

  // calc shortest path from start to thera
  var minjumps = Infinity;
  var closestPreConnection;
  var shortestPreRoute;
  for (var entry of theraholes) {
    var theraConnection = entry.destinationSolarSystem;

    var route = map.Route(startSystem.ID, theraConnection.id, [], false, false);
    // console.log(theraConnection.name + ' ' + theraConnection.id);
    // console.log(theraConnection.name + ' ' /*+ theraConnection.id*/ + ': ' + route.length)
    if (route.length < minjumps && (route != 0 || startSystem.ID == theraConnection.id)) {
      minjumps = route.length;
      closestPreConnection = theraConnection;
      shortestPreRoute = route;
    }

    // console.log('http://eve-gatecheck.space/eve/#' + startSystem.name + ':' + theraConnection.name + ':shortest');
  }
  console.log('closest Thera connection to start: ' + closestPreConnection.name + ', ' + shortestPreRoute.length + ' jumps');
  // TODO: wormhole info (sigs, EOL, size, etc)

  // calc shortest path from thera to each of the hubs
  hubs.forEach((hub) => {
    console.log('checking route to ' + hub)
    var hubSystem = map.GetSystem({name: hub});

    var shortestKSpaceRoute = map.Route(startSystem.ID, hubSystem.ID, [], false, false);
    console.log('shortest k-space route to ' + hub + ': ' + shortestKSpaceRoute.length + ' jumps');
    /*if (shortestPreRoute.length + 2 >= shortestKSpaceRoute) {
      console.log('shortest route including Thera longer than shortest k-space route to ' + hub);
      
      // TODO: provide comparison betw routes (more details)
    }*/

    var minjumps = Infinity;
    var closestPostConnection;
    var shortestPostRoute;
    for (var entry of theraholes) {
      var theraConnection = entry.destinationSolarSystem;
      // console.log(theraConnection);

      var route = map.Route(theraConnection.id, hubSystem.ID, [], false, false);
      // console.log(theraConnection.name + ' ' /*+ theraConnection.id*/ + ': ' + route.length)
      if (route.length < minjumps && (route.length != 0 || theraConnection.id == hubSystem.ID)) {
        minjumps = route.length;
        closestPostConnection = theraConnection;
        shortestPostRoute = route;
      }

      // console.log('http://eve-gatecheck.space/eve/#' + theraConnection.name + ':' + hub + ':shortest');
    }
    console.log('closest Thera connection to ' + hub + ': ' + closestPostConnection.name + ', ' + shortestPostRoute.length + ' jumps');
    console.log('shortest route length via Thera: ' + (shortestPreRoute.length + 2 + shortestPostRoute.length) + ' jumps');


    // TODO: wormhole info (sigs, EOL, size, etc)

    // TODO: provide comparison betw routes (more details)




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
    // console.log(composedRoute)

    // TODO: currently suggested is same as shortest; this will change after adding system avoidance
    // print out systems along route
    console.log('suggested Thera route from ' + start + ' to ' + hub +
      ': ' + (composedRoute.length - 1) + ' jumps')

    // in future?
    // map id to info

    // reduce on info
    // kills on route
    // hs, ls, ns systems
    // regions

    var completed_requests = 0;
    var totalkills = 0;
    composedRoute.forEach((obj) => {
      // var systemname = (systemid == theraSystem.ID) ? theraSystem.name : map.GetSystem({id: systemid}).name;
      console.log(obj.name);
      // async(checkZKill(systemid));

    });

    composedRoute.forEach((obj) => {
      // get kills for given system within the past hour
      const req = https.get('https://www.zkillboard.com/api/kills/solarSystemID/' +
        obj.id + '/pastSeconds/3600/',
        (res) => {
        // console.log(`STATUS: ${res.statusCode}`);
        // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');

        var zkilljson = '';
        // console.log('start json ' + evescoutjson)
        res.on('data', (chunk) => {
          zkilljson += chunk;
        });
        res.on('end', () => {
          obj.kills = JSON.parse(zkilljson); // TODO: more kill info later
          // console.log('json for ' + map.GetSystem({id: systemid}).name + ': ' + zkilljson)
          
          // var killsInLastHr = kills.length;
          totalkills += obj.kills.length;
          // console.log(killsInLastHr + ' kills in last hour in ' + systemname)
          completed_requests++;
          if (completed_requests == composedRoute.length) {
            // console.log('all requests done')
            console.log(totalkills + ' total kills on ' + hub + ' route in last hour')
          }
        });
      });
    });


    // for (var systemid of shortestPreRoute) {
    //   console.log(map.GetSystem({id: systemid}).name);
    //   checkZKill(systemid);
    // }

    // console.log('Thera'); // TODO: add entrance/exit wormhole info before/after
    
      // console.log(map.GetSystem({id: systemid}).name);
      // checkZKill(systemid);
    // for (var systemid of shortestPostRoute) {
    //   console.log(map.GetSystem({id: systemid}).name);
    //   checkZKill(systemid);
    // }

  });

}

// TODO: zkill checks here.
// TODO: check starting system and thera too
function checkZKill(systemid) {
  // TODO: get kills for more time intervals (eg last n hrs, last weekend for a start)

  // get kills for given system within the past hour
  const req = https.get('https://www.zkillboard.com/api/kills/solarSystemID/' + systemid + 'pastSeconds/3600', (res) => {
    // console.log(`STATUS: ${res.statusCode}`);
    // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');

    var zkilljson = '';
    // console.log('start json ' + evescoutjson)
    res.on('data', (chunk) => {
      zkilljson += chunk;
    });
    res.on('end', () => {
      // routeStuff(evescoutjson);
      var killsInLastHr = zkilljson.length;
      console.log(killsInLastHr + ' kills in last hour')
    }
      // getJumps(evescoutjson) // TODO; why doesn't this work?
    );
  });
}

// to play with routes
function routeStuff(evescoutjson) {
  var theraholes = JSON.parse(evescoutjson);
  var hubSystem;
  for (var hub of hubs) {
    console.log('hub: ' + hub)

    hubSystem = map.GetSystem({name: hub});
    console.log('hub ID: ' + hubSystem.ID)
    // for (var entry of theraholes) {
      var startSystem = map.GetSystem({name: start});
      console.log('start ID: ' + startSystem.ID)
      var route = map.Route(startSystem.ID, hubSystem.ID, [], false, false);

      console.log('route stuff')
      console.log(route.length);
      console.log(route);

      // console.log('http://eve-gatecheck.space/eve/#' + currSystem + ':' + hub + ':shortest');
    // }
  }
}