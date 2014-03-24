var _ = require("lodash");
var q = require('q');
var semver = require('semver');

function ConflictError(dependency, constraints) {
  this.dependency = dependency;
  this.constraints = constraints;
}

ConflictError.prototype.toString = function () {
  return 'None of "' + this.dependency + '" version satisfies all the constraints: (' + this.constraints.join(', ') + ')';
};

function getAllVersionsInRange(repository, name, constraint) {
  return repository.get(name).then(function (packageInfo) {
    var validVersions = _.keys(packageInfo.versions).sort(semver.rcompare).filter(function (versionCandidate) {
      return semver.satisfies(versionCandidate, constraint);
    });

    return validVersions.length ? validVersions : [];
  });
}

function getPackageDependencies(repository, name, version) {
  return repository.get(name).then(function (packageInfo) {
    var versionInfo = packageInfo.versions[version];
    return versionInfo.dependencies || {};
  });
}

function getDependencyVersionsToSelect(repository, name, constraint, currentSolution, remainingToSelect) {

  //possible conflict: current solution
  if (currentSolution[name]) {
    if (!semver.satisfies(currentSolution[name], constraint)) {
      return q.reject(new ConflictError(name, [currentSolution[name], constraint])); //backtrack
    } else {
      return [currentSolution[name]];
    }
  } else {
    //possible conflict: remaining to select
    if (remainingToSelect[name]) {
      return getAllVersionsInRange(repository, name, constraint).then(function (allInRange) {
        var versionsIntersect = _.intersection(remainingToSelect[name], allInRange);
        //if an intersection is empty we can abort, as we are never going to find any matching version
        if (versionsIntersect.length === 0) {
          return q.reject(new ConflictError(name, [depsToSelect[name], constraint])); //backtrack
        }
        return versionsIntersect;
      });
    } else {
      return getAllVersionsInRange(repository, name, constraint);
    }
  }
}

function tryDependencyVersions(repository, name, versions, currentSolution, remainingToSelect) {

  var version = versions[0];
  return getPackageDependencies(repository, name, version).then(function (dependencies) {

    var newSolution = _.assign({}, currentSolution);
    newSolution[name] = version;

    return resolvePackages(repository, dependencies, newSolution, remainingToSelect).then(function (solution) {
      return solution;
    }, function (err) {
      if (versions.length > 0) {
        return tryDependencyVersions(repository, name, _.drop(versions), currentSolution, remainingToSelect);
      } else {
        return q.reject(err);
      }
    });
  });
}

/**
 * Given a list of root (top-level) dependencies, traverse the whole dependency tree and try to flattenme, version  in.
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

  var remainingToSelectKeys = _.keys(rootDependencies);
  var newDepsPromises = remainingToSelectKeys.map(function (name) {
    return getDependencyVersionsToSelect(repository, name, rootDependencies[name], currentSolution, remainingToSelect);
  });

  return q.all(newDepsPromises).then(function (versionsToSelect) {

    var depsToSelect = _.assign({}, remainingToSelect);
    versionsToSelect.forEach(function (version, idx) {
      var name = remainingToSelectKeys[idx];
      if (!currentSolution[name]) {
        depsToSelect[remainingToSelectKeys[idx]] = version;
      }
    });

    //do I have a solution already?
    if (_.keys(depsToSelect).length) {

      //forEach dependency
      return _.keys(depsToSelect).reduce(function (parentSolutionPromise, nextSelection) {

        var newRemainingToSelect = _.assign({}, depsToSelect);
        delete newRemainingToSelect[nextSelection];

        return parentSolutionPromise.then(function (parentSolution) {
          //forEach version
          return tryDependencyVersions(repository, nextSelection, depsToSelect[nextSelection], parentSolution, newRemainingToSelect);
        });

      }, q.when(currentSolution));
    } else {
      return q.when(currentSolution);
    }
  });
}

exports.resolvePackages = function (repository, rootPackage) {
  return resolvePackages(repository, rootPackage, {}, {});
};
