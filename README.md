# thera-trip-check
Given a starting system _K_, retrieves information about routes from _K_ to desired systems or market hubs via Thera wormholes in the EVE Online universe.  
Made possible by: [EVE-Scout](https://www.eve-scout.com/) API, [EVEoj library](https://github.com/nezroy/EVEoj), [zKillboard API](https://github.com/zKillboard/zKillboard/wiki)

__Requirements__:  
[Node.js](https://nodejs.org/en/download/)  
[EVEoj static JSON](https://eve-oj.com/#downloads)

__Setup__:  
Put a copy of the EVEoj static JSON data folder in a folder named `staticevedata` in the same directory as `thera-trip-check.js`.

__Usage__:  
`node theraTripCheck.js <start system> [end system] [end system] [end system]`
