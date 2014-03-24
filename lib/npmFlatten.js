var _ = require("lodash");
var q = require('q');
var semver = require('semver');

function ConflictError(dependency, constraints) {
  this.dependency = dependency;
  this.constraints = constraints;
}

ConflictError.prototype.toString = function() {
    return 'None of "' + this.dependency + '" version satisfies all the constraints: (' + this.constraints.join(', ') + ')';
};

function getAllVersionsInRange(repository, name, constraint) {
  return repository.get(name).then(function(packageInfo){
    var validVersions = _.keys(packageInfo.versions).sort(semver.rcompare).filter(function (versionCandidate) {
      return semver.satisfies(versionCandidate, constraint);
    });

    return validVersions.length ? validVersions : [];
  });
}

function getPackageDependencies(repository, name, version) {
  return repository.get(name).then(function(packageInfo){
    var versionInfo = packageInfo.versions[version];
    return versionInfo.dependencies || {};
  });
}

/**
 * Given a list of root (top-level) dependencies, traverse the whole dependency tree and try to flatten in.
 * There are multiple possible valid solutions and this function will return only one such solution or will
 * throw an exception if a solution doesn't exist.
 *
 * @param repository
 * @param rootDependencies an Object where keys are dependency names and values are semver ranges
 * @param currentSolution an Object representing solution built so far
 * @param remainingToSelect an Object representing a set of dependencies that are remaining to be selected
 * @returns {*}
 */
function resolvePackages(repository, rootDependencies, currentSolution, remainingToSelect) {

  //build a new set of remaining variables to assign
  /*var depsToSelect = _.assign({}, remainingToSelect);
  _.forEach(rootDependencies, function (constraint, name) {

    //possible conflict: current solution
    if (currentSolution[name]) {
      if (!semver.satisfies(currentSolution[name], constraint)) {
        throw new ConflictError(name, [currentSolution[name], constraint]); //backtrack
      } //else ignore this dependency, I've got a matching solution already
    } else {
      //possible conflict: remaining to select
      if (depsToSelect[name]) {
        var versionsIntersect = _.intersection(depsToSelect[name], getAllVersionsInRange(repository, name, constraint));
        //if an intersection is empty we can abort, as we are never going to find any matching version
        if (versionsIntersect.length === 0) {
          throw new ConflictError(name, [depsToSelect[name], constraint]); //backtrack
        }
        depsToSelect[name] = versionsIntersect;
      } else {
        depsToSelect[name] = getAllVersionsInRange(repository, name, constraint);
      }
    }
  });

  //we need to realize that we are doing some prioritization of deps iteration order here,
  //and as such we should determine an order that leads to the fastest path prunning (start with deps with the smallest no of versions?)
  var depNames = _.keys(depsToSelect);
  for (var i = 0; i < depNames.length; i++) {
    var dep = depNames[i];
    var versions = depsToSelect[dep];

    //here versions are prioritized from the latest to the earliest
    for (var j = 0; j < versions.length; j++) {
      var version = versions[j];

      var newSolution = _.assign({}, currentSolution);
      var newRemaining = _.assign({}, depsToSelect);

      newSolution[dep] = version;
      delete newRemaining[dep];

      try {
        return resolvePackages(repository, getPackageDependencies(repository, dep, version), newSolution, newRemaining);
      } catch (e) {
        if (e instanceof ConflictError && j < versions.length - 1) {
          //there are still some remaining versions to try out
          //ignore this ex and continue with a next version
        } else {
          //we need to give up here, no more version to try :-/
          throw e;
        }
      }
    }
  }*/

  return q.when(currentSolution);
}

exports.resolvePackages = function(repository, rootPackage) {
  return resolvePackages(repository, rootPackage, {}, {});
};