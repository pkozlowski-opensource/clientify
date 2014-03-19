var _ = require("lodash");
var semver = require('semver');
var expect = require('chai').expect;
var foo = require("../lib/foo");

describe('tree flattening', function () {

  var packages = {
    jquery: {
      '1.10.0': {},
      '1.10.1': {}
    },
    angularjs: {
      '1.0.10': {},
      '1.2.10': {},
      '1.2.11': {},
      '1.2.12': {},
      '1.2.13': {}
    },
    datepicker: {
      '0.0.0': { dependencies: { angularjs: '<=1.0.10', jquery: '1.10.1'}},
      '0.0.1': { dependencies: { angularjs: '<=1.2.12', jquery: '1.10.1'}}
    },
    timepicker: {
      '0.0.1': { dependencies: { angularjs: '>=1.2.10'}},
      '0.0.2': { dependencies: { angularjs: '1.2.13'}}
    },
    adminmodule: {
      '0.1.0': { dependencies: { datepicker: '>=0.0.0' }},
      '0.2.0': { dependencies: { datepicker: '>=0.0.0' }, angularjs: '1.2.11'}
    },
    publicmodule: {
      '0.1.0': { dependencies: { timepicker: '>=0.0.0' }}
    },
    searchmodule: {
      '0.0.1': { dependencies: {datepicker: '0.0.0'}}
    }
  };

  var repository = {

    latest: function (name) {
      return _.keys(packages[name]).sort(semver.rcompare)[0];
    },

    get: function (name, version) {

      version = version || this.latest(name);

      if (packages[name]) {
        var pkg = packages[name][version];

        pkg.name = name;
        pkg.version = version;
        pkg.versions = _.keys(packages[name]);

        return pkg;
      } else {
        throw new Error('Package "' + name + '" does not exist');
      }
    }
  };

  function testTree(rootPackageDeps, expectedOut) {
    expect(foo.doFlatten(repository, {
      name: 'app',
      version: '1.0.0',
      dependencies: rootPackageDeps
    })).to.deep.equal(expectedOut);
  }


  describe('happy path', function () {

    it('should return empty list of packages to install for a package with no dependencies', function () {
      testTree({}, {});
    });

    it('should return fixed versions for a 1-level dependency tree with no overlaps', function () {
      testTree({
        jquery: '1.10.0',
        angularjs: '1.2.10'
      }, {
        jquery: '1.10.0',
        angularjs: '1.2.10'
      });
    });

    it('should return latest versions for 1-level dependency tree with no overlaps', function () {
      testTree({
        jquery: '~1.10.0',
        angularjs: '~1.2.10'
      }, {
        jquery: '1.10.1',
        angularjs: '1.2.13'
      });

    });

    it('should return the latest version of a common dependency where overlap exists', function () {
      testTree({
        datepicker: '0.0.1',
        timepicker: '0.0.1'
      }, {
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should return the latest version of a common dependency where overlap exists - order independent', function () {
      testTree({
        timepicker: '0.0.1',
        datepicker: '0.0.1'
      }, {
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should figure out the latest version of a root dependency that results in a valid tree', function () {
      testTree({
        datepicker: '0.0.1',
        timepicker: '>=0.0.1'
      }, {
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should figure out the latest version of a root dependency that results in a valid tree - different order', function () {
      testTree({
        timepicker: '>=0.0.1',
        datepicker: '0.0.1'
      }, {
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should properly resolve deeper trees', function () {
      testTree({
        adminmodule: '0.1.0',
        publicmodule: '0.1.0'
      }, {
        adminmodule: '0.1.0',
        publicmodule: '0.1.0',
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should properly resolve deeper trees with constraints anywhere in the tree', function () {
      testTree({
        adminmodule: '0.x.0',
        publicmodule: '0.1.0'
      }, {
        adminmodule: '0.2.0',
        publicmodule: '0.1.0',
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.12'
      });
    });

    it('should properly resolve deeper trees and fixed modules on the root level', function () {
      testTree({
        adminmodule: '0.1.0',
        publicmodule: '0.1.0',
        angularjs: '1.2.11'
      }, {
        adminmodule: '0.1.0',
        publicmodule: '0.1.0',
        datepicker: '0.0.1',
        timepicker: '0.0.1',
        jquery: '1.10.1',
        angularjs: '1.2.11'
      });
    });

  });

  describe('error conditions', function () {

    it('should report reference to range for which there are no versions in the repository', function () {
      expect(function () {
        testTree({ timepicker: '50.0.1'});
      }, {}).to.throw(/There is no version of "timepicker" in the repository that would satisfy "50.0.1" constraint./);
    });

    it('should detect conflicts on the 1-st level', function () {
      expect(function () {
        testTree({
            datepicker: '0.0.0',
            timepicker: '0.0.1'}
        );
      }).to.throw('None of "angularjs" version satisfies all the constraints: ()');
    });

    it('should detect conflicts in a tree with many levels', function () {
      expect(function () {
        testTree({
            searchmodule: '0.0.1',
            publicmodule: '0.1.0'
          }
        );
      }).to.throw('None of "angularjs" version satisfies all the constraints: ()');
    });

    it('should report pacakges not existing in a repository', function () {
      expect(function () {
        testTree({'non-existing': '0.0.1'});
      }).to.throw('Package "non-existing" does not exist');
    });

    //test exposing the situation in the exception
  });

  // remove code duplication while dealing with intersections
  // the algorithm is totally not optimized etc...

});
