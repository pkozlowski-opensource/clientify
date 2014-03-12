var npm = require('npm');
var q = require('q');
var npmLoad = q.nbind(npm.load, npm);

npmLoad().then(function(npm){

  var registryGet = q.nbind(npm.registry.get, npm.registry);

  registryGet('stowe.js').then(function(data) {
    console.log(data);
  });

});