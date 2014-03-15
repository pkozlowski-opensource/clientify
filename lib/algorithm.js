var _ = require("lodash");
var semver = require('semver');

function InvalidCandidateVersionError(msg) {
  this.msg = msg;
}

function InvalidCandidateError(msg) {
  this.msg = msg;
}

function getAllVersionsInRange(name, constraint, repository) {

  var packageInfo = repository.get(name);
  var validVersions = packageInfo.versions.sort(semver.rcompare).filter(function (versionCandidate) {
    return semver.satisfies(versionCandidate, constraint);
  });

  return validVersions.length ? validVersions : [];
}

function resolveCandidateTree(repository, rootPackage, parentConstraints, parentRange) {

  var result = {};

  if (rootPackage.dependencies) {

    var depesInOrder = _.keys(rootPackage.dependencies);
    var noOfTries = depesInOrder.length;

    for (var i = 0; i < noOfTries; i++) {

      var nodeConstraints = _.assign({}, parentConstraints);

      try {

        //for each dependency of a given node
        _.forEach(depesInOrder, function (name) {

          var range = rootPackage.dependencies[name];

          var candidateVersions = getAllVersionsInRange(name, range, repository);
          if (!candidateVersions.length) {
            throw new Error('There is no version of "' + name + '" in the repository that would satisfy "' + range + '" constraint.');
          }

          var validVersions = _.intersection(nodeConstraints[name] || candidateVersions, candidateVersions);
          if (!validVersions.length) {
            throw new InvalidCandidateVersionError('None of "' + name + '" version satisfies all the constraints: ()');
          }

          //for each valid version of a dependency (sorted in the descending order)
          for (var i = 0; i < validVersions.length; i++) {

            var candidate = repository.get(name, validVersions[i]);

            //create a new constraints object:
            var candidateConstraint = {};
            candidateConstraint[name] = [candidate.version];
            var constraints = _.assign({}, nodeConstraints, candidateConstraint);

            try {

              var treeResult = resolveCandidateTree(repository, candidate, constraints, range);

              //merge current constraints with the one from subtree
              _.assign(result, nodeConstraints);
              _.forEach(treeResult, function (childConstraints, childName) {

                var c = _.intersection(nodeConstraints[childName] || childConstraints, childConstraints);
                if (c.length) {
                  nodeConstraints[childName] = c;
                  result[childName] = c;
                } else {
                  //TODO: write a test for this condition - the whole subtree is invalid
                  throw new InvalidCandidateVersionError('unresolved conflict for "' + childName + '": ' + nodeConstraints[childName]);
                }
              });

              //an elected version satisfies all the constraints, no need to search any further
              break;

            } catch (e) {

              if (e instanceof InvalidCandidateVersionError) {
                if (i < validVersions.length - 1) {
                  //swallow, will try an older version
                } else {
                  //there are no more versions to try - need to start with another dependency..
                  throw new InvalidCandidateError(e.msg);
                }
              } else {
                throw e;
              }
            }
          }

        });

        break;

      } catch (e) {

        if (e instanceof InvalidCandidateError) {

          if (i < noOfTries -1) {
            //rotate the array
            var firstEl = depesInOrder.shift();
            depesInOrder.push(firstEl);

          } else {
            throw new Error(e.msg);
          }

        } else {
          throw e;
        }
      }
    }

  } else {

    if (parentRange) {
      result[rootPackage.name] = getAllVersionsInRange(rootPackage.name, parentRange, repository);
    }
    //else: an empty app without dependencies
  }

  return result;
}

function doFlatten(repository, rootPackage) {

  var flatResult = {}, result = resolveCandidateTree(repository, rootPackage, {});

  _.forEach(result, function (candidateVersions, name) {
    flatResult[name] = candidateVersions.sort(semver.rcompare)[0];
  });

  return flatResult;
}

exports.doFlatten = doFlatten;