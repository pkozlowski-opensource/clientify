var _ = require("lodash");
var semver = require('semver');

function ConflictError(dependency, constraints) {
  this.dependency = dependency;
  this.constraints = constraints;
}

ConflictError.prototype.toString = function() {
    return 'None of "' + this.dependency + '" version satisfies all the constraints: (' + this.constraints.join(', ') + ')';
};

function getAllVersionsInRange(name, constraint, repository) {

  var packageInfo = repository.get(name);
  var validVersions = packageInfo.versions.sort(semver.rcompare).filter(function (versionCandidate) {
    return semver.satisfies(versionCandidate, constraint);
  });

  return validVersions.length ? validVersions : [];
}

function resolvePackages(repository, rootPackage, currentSolution, remainingToSelect) {

  //build a new set of remaining variables to assign
  var depsToSelect = _.assign({}, remainingToSelect);
  _.forEach(rootPackage.dependencies || {}, function (constraint, name) {
    //possible conflict: current solution
    if (currentSolution[name]) {
      if (!semver.satisfies(currentSolution[name], constraint)) {
        throw new ConflictError(name, [currentSolution[name], constraint]); //backtrack
      } //else ignore this dependency, I've got a matching solution already
    } else {
      //possible conflict: remaining to select
      if (depsToSelect[name]) {
        var versionsIntersect = _.intersection(depsToSelect[name], getAllVersionsInRange(name, constraint, repository));
        //if an intersection is empty we can abort, as we are never going to find any matching version
        if (versionsIntersect.length === 0) {
          throw new ConflictError(name, [depsToSelect[name], constraint]); //backtrack
        }
        depsToSelect[name] = versionsIntersect;
      } else {
        depsToSelect[name] = getAllVersionsInRange(name, constraint, repository);
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
        return resolvePackages(repository, repository.get(dep, version), newSolution, newRemaining);
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
  }

  return currentSolution;
}

exports.resolvePackages = function(repository, rootPackage) {
  return resolvePackages(repository, rootPackage, {}, {});
};