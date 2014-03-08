#!/usr/bin/env node

var path = require('path');
var wrench = require('wrench');
var clientify = require('../index');

var cwd = process.cwd();

clientify.readDependencyTree(cwd).then(function (tree) {

  var flat = clientify.flattenDependencyTree(tree);

  Object.keys(flat).sort().forEach(function (depName) {
    var electedVersion = clientify.electVersion(flat[depName]);
    var targetDir = path.join(cwd, 'browser_modules', depName);

    //TODO: nice output
    console.log(depName + '@' + electedVersion.version);

    wrench.mkdirSyncRecursive(targetDir);

    //FIXME: looks like wrench ignores filters in its async version, need to send them a PR...
    wrench.copyDirSyncRecursive(electedVersion.path, targetDir, {
      forceDelete: true,
      filter: /node_modules/
    }, function(cbArg){
    })
  });

}).done();