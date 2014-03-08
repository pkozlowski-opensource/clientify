var semver = require('semver');
var _ = require("lodash");

function electVersion(candidates) {

  //find versions that match all ranges O(n2)
  var matchingCandidates = candidates.filter(function (candidate) {
    return candidates.every(function (otherCandidate) {
      return semver.satisfies(candidate.version, otherCandidate.range);
    })
  });

  if (matchingCandidates.length) {
    //sort remaining versions in order to get the latest matching version O(nlogn)
    matchingCandidates.sort(function (v1, v2) {
      return semver.compare(v1.version, v2.version);
    });

    return matchingCandidates[matchingCandidates.length - 1];
  } else {
    throw new Error('Failed to elect a version matching all the required ranges: [' +
      _.pluck(candidates, 'range').join(', ') + ']');
  }
}

module.exports = electVersion;