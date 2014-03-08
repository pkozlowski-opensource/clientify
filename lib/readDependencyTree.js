var path = require('path');
var q = require('q');
var readPackageJson = q.denodeify(require('read-package-json'));

function notNull(arg) {
  return arg !== null;
}

function readDependencyTree(modulePath) {

  return readPackageJson(path.join(modulePath, 'package.json'), console.error, false).then(function (pkgJson) {

    return q.all(Object.keys(pkgJson.dependencies || {}).map(function (depName) {

      return readDependencyTree(path.join(modulePath, 'node_modules', depName));

    })).then(function (depsFromPackage) {

      return {
        name: pkgJson.name,
        path: modulePath,
        version: pkgJson.version,
        dependencies: depsFromPackage.filter(notNull).map(function (dependency) {
          dependency.range = pkgJson.dependencies[dependency.name];
          return dependency;
        })
      };
    });

  }, function (err) {
    //TODO: handle a case where:
    // - a dependency is declared in package.json but doesn't exist on the disk
    //      this can happen if it wasn't installed yet, was moved by npm highier up etc.
    // - program was invoked in a folder where there is no package.json
    return null;
  });

}

module.exports = readDependencyTree;