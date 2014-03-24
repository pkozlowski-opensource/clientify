var npm = require('npm');
var q = require('q');
var npmFlatten = require("./lib/npmFlatten.js");
var npmLoad = q.nbind(npm.load, npm);

npmLoad().then(function (npm) {

  var cache = {};

  var registryGet = q.nbind(npm.registry.get, npm.registry);
  var registry = {
    get: function (pkgName) {
      if (cache[pkgName]) {
        return q.when(cache[pkgName])
      } else {
        return registryGet(pkgName).then(function (data) {
          cache[pkgName] = data[0];
          return data[0];
        })
      }
    }
  };

  npmFlatten.resolvePackages(registry, {
    'di': '*'
  }).then(function (result) {
    console.log(result);
  }).done();
});
