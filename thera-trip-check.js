if (process.argv.length < 3) {
  // TODO: system avoidance
  console.log('usage: theraTripCheck.js [start system]')
  process.exit(1);
}

const start = process.argv[2].toUpperCase();
console.log('theraTripCheck: running check for system ' + start);

const hubs = ["Jita", "Amarr", "Dodixie"];

const EVEoj = require("EVEoj");
// var SDD = EVEoj.SDD.Create("json", {path: "D:/Documents/staticevedata"});
var SDD = EVEoj.SDD.Create("json", {path: "staticevedata"});
var map;
SDD.LoadMeta().then(function() {
  map = EVEoj.map.Create(SDD, "K");
  return map.Load();
});

const http = require('http');
const https = require('https');

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
  var shortestPreThera = Infinity;
  var closestPreThera;
  for (var entry of theraholes) {
    var theraConnection = entry.destinationSolarSystem;

    var route = map.Route(startSystem.ID, theraConnection.id, [], false, false);
    // console.log(theraConnection.name + " " + theraConnection.id);
    console.log(theraConnection.name + " " + theraConnection.id + ": " + route.length)
    if (route.length < shortestPreThera && (route != 0 || startSystem.ID == theraConnection.id)) {
      shortestPreThera = route.length;
      closestPreThera = theraConnection;
    }

    // console.log("http://eve-gatecheck.space/eve/#" + startSystem.name + ":" + theraConnection.name + ":shortest");
  }
  console.log("closest Thera connection to start: " + closestPreThera.name + ", " + shortestPreThera + " jumps");
  // TODO: wormhole info (sigs, EOL, size, etc)

  // calc shortest path from thera to each of the hubs
  for (var hub of hubs) {
    console.log("checking route to " + hub)
    var hubSystem = map.GetSystem({name: hub});

    var shortestKSpaceRoute = map.Route(startSystem.ID, hubSystem.ID, [], false, false);
    if (shortestPreThera + 2 >= shortestKSpaceRoute) {
      console.log("shortest route including Thera longer than shortest k-space route to " + hub);
      
      // TODO: do i really want to continue? what if thera route slightly longer but much safer?
      // TODO: provide comparison betw routes (more details)

      continue;
    }

    var shortestPostThera = Infinity;
    var closestPostThera;
    for (var entry of theraholes) {
      var theraConnection = entry.destinationSolarSystem;
      // console.log(theraConnection);

      var route = map.Route(theraConnection.id, hubSystem.ID, [], false, false);
      console.log(theraConnection.name + " " + theraConnection.id + ": " + route.length)
      if (route.length < shortestPostThera && (route.length != 0 || theraConnection.id == hubSystem.ID)) {
        shortestPostThera = route.length;
        closestPostThera = theraConnection;
      }

      // console.log("http://eve-gatecheck.space/eve/#" + theraConnection.name + ":" + hub + ":shortest");
    }
    // console.log("shortestPreThera: " + shortestPreThera + " shortestPostThera: " + shortestPostThera)
    console.log("shortest route length via Thera: " + (shortestPreThera + shortestPostThera) + " jumps");

    console.log("closest Thera connection to " + hub + ": " + closestPreThera.name + ", " + shortestPostThera + " jumps");
    // TODO: wormhole info (sigs, EOL, size, etc)

    if (shortestPreThera + 2 + shortestPostThera >= shortestKSpaceRoute.length) {
      console.log("shortest Thera route longer than shortest k-space route to " + hub);
      
      // TODO: provide comparison betw routes (more details)

    }
  }

}

// wont work, need to use .id
// helper function
// function getRouteToThera(start, end) {
//   for (var entry of theraholes) {
//     var currSystem = entry.destinationSolarSystem.name;
//     console.log(currSystem);

//     var route = map.Route(startSystem.ID, entry.destinationSolarSystem.ID, [], false, false);
//     if (route.length < shortestPreThera) {
//       shortestPreThera = route.length;
//     }

//     console.log("http://eve-gatecheck.space/eve/#" + currSystem + ":" + hub + ":shortest");
//   }
// }

// TODO: zkill checks here.
// TODO: check thera itself too
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