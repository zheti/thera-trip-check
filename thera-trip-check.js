if (process.argv.length < 3) {
  // TODO: system avoidance
  // TODO: choice of checking hubs or input
  console.log('usage: theraTripCheck.js [start system]')
  process.exit(1);
}

const start = process.argv[2].toUpperCase();
console.log('theraTripCheck: running check for system ' + start);
var startSystem;

const EVEoj = require("EVEoj");
var SDD = EVEoj.SDD.Create("json", {path: "staticevedata"});
var map;
SDD.LoadMeta().then(function() {
  map = EVEoj.map.Create(SDD, "K");
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

const hubs = ["Jita", "Amarr", "Dodixie"];
const req = https.get('https://www.eve-scout.com/api/wormholes', (res) => {
  // console.log(`STATUS: ${res.statusCode}`);
  // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');

  var evescoutjson = '';
  // console.log("start json " + evescoutjson)
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
  // console.log("calculating with " +  evescoutjson)

  var theraholes = JSON.parse(evescoutjson);
  var startSystem = map.GetSystem({name: start});

  // calc shortest path from start to thera
  var minjumps = Infinity;
  var closestConnection;
  var shortestPreRoute;
  for (var entry of theraholes) {
    var theraConnection = entry.destinationSolarSystem;

    var route = map.Route(startSystem.ID, theraConnection.id, [], false, false);
    // console.log(theraConnection.name + " " + theraConnection.id);
    console.log(theraConnection.name + " " /*+ theraConnection.id*/ + ": " + route.length)
    if (route.length < minjumps && (route != 0 || startSystem.ID == theraConnection.id)) {
      minjumps = route.length;
      closestConnection = theraConnection;
      shortestPreRoute = route;
    }

    // console.log("http://eve-gatecheck.space/eve/#" + startSystem.name + ":" + theraConnection.name + ":shortest");
  }
  console.log("closest Thera connection to start: " + closestConnection.name + ", " + shortestPreRoute.length + " jumps");
  // TODO: wormhole info (sigs, EOL, size, etc)

  // calc shortest path from thera to each of the hubs
  for (var hub of hubs) {
    console.log("checking route to " + hub)
    var hubSystem = map.GetSystem({name: hub});

    var shortestKSpaceRoute = map.Route(startSystem.ID, hubSystem.ID, [], false, false);
    if (shortestPreRoute.length + 2 >= shortestKSpaceRoute) {
      console.log("shortest route including Thera longer than shortest k-space route to " + hub);
      
      // TODO: do i really want to continue? what if thera route slightly longer but much safer?
      // TODO: provide comparison betw routes (more details)

      continue;
    }

    var minjumps = Infinity;
    var closestConnection;
    var shortestPostRoute;
    for (var entry of theraholes) {
      var theraConnection = entry.destinationSolarSystem;
      // console.log(theraConnection);

      var route = map.Route(theraConnection.id, hubSystem.ID, [], false, false);
      console.log(theraConnection.name + " " /*+ theraConnection.id*/ + ": " + route.length)
      if (route.length < minjumps && (route.length != 0 || theraConnection.id == hubSystem.ID)) {
        minjumps = route.length;
        closestConnection = theraConnection;
        shortestPostRoute = route;
      }

      // console.log("http://eve-gatecheck.space/eve/#" + theraConnection.name + ":" + hub + ":shortest");
    }
    // console.log("shortest jumps pre-Thera: " + shortestPreRoute.length + " shortest jumps post-Thera: " + shortestPostRoute.length)
    console.log("shortest route length via Thera: " + (shortestPreRoute.length + shortestPostRoute.length) + " jumps");

    console.log("closest Thera connection to " + hub + ": " + closestConnection.name + ", " + shortestPostRoute.length + " jumps");
    // TODO: wormhole info (sigs, EOL, size, etc)

    if (shortestPreRoute.length + 2 + shortestPostRoute.length >= shortestKSpaceRoute.length) {
      console.log("shortest Thera route longer than shortest k-space route to " + hub);
      
      // TODO: provide comparison betw routes (more details)

    }

    // print out systems along route
    console.log("suggested route from " + start + " to " + hub)
    for (var systemid of shortestPreRoute) {
      console.log(map.GetSystem({id: systemid}).name);
    }
    console.log("Thera"); // TODO: add entrance/exit wormhole info before/after
    for (var systemid of shortestPostRoute) {
      console.log(map.GetSystem({id: systemid}).name);
    }
  }

}

// TODO: zkill checks here.
// TODO: check starting system and thera too
function checkZKill(system) {
  //
}

// to play with routes
function routeStuff(evescoutjson) {
  var theraholes = JSON.parse(evescoutjson);
  var hubSystem;
  for (var hub of hubs) {
    console.log("hub: " + hub)

    hubSystem = map.GetSystem({name: hub});
    console.log("hub ID: " + hubSystem.ID)
    // for (var entry of theraholes) {
      var startSystem = map.GetSystem({name: start});
      console.log("start ID: " + startSystem.ID)
      var route = map.Route(startSystem.ID, hubSystem.ID, [], false, false);

      console.log("route stuff")
      console.log(route.length);
      console.log(route);

      // console.log("http://eve-gatecheck.space/eve/#" + currSystem + ":" + hub + ":shortest");
    // }
  }
}