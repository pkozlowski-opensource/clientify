var _ = require("lodash");

module.exports = function flattenDependencyTree(tree, flattenResults) {

  flattenResults = flattenResults || {};

  if (tree.dependencies) {
    tree.dependencies.forEach(function (dependency) {

      (flattenResults[dependency.name] || (flattenResults[dependency.name] = [])).push(
        _.assign({}, _.pick(dependency, ['version', 'range', 'path']), {
          parent: _.pick(tree, ['name', 'version'])
        }));

      flattenDependencyTree(dependency, flattenResults);
    });
  }

  return flattenResults;
};