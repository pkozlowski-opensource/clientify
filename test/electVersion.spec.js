var expect = require('chai').expect;
var electVersion = require("../lib/electVersion");

describe('electing a version', function () {

  describe('happy paths', function () {

    it('should elect the only version available', function () {
      expect(electVersion([
        {version: '1.0.0', range: '<=1.0.0'}]).version)
        .to.equal('1.0.0');
    });

    it('should elect the latest installed version when all ranges are matching', function () {
      expect(electVersion([
        {version: '0.8.0', range: '>=0.5.0'},
        {version: '1.0.0', range: '1.0.0'}]).version)
        .to.equal('1.0.0');
    });

    it('should elect the latest version from the ones matching alle the ranges', function () {
      expect(electVersion([
        {version: '0.8.0', range: '<=0.8.0'},
        {version: '1.0.0', range: '<=1.0.0'},
        {version: '0.5.0', range: '0.5.0'}]).version)
        .to.equal('0.5.0');
    });
  });

  describe('error paths', function () {

    it('should throw an exception when no matching version', function () {
      expect(function() {
        electVersion([
          {version: '0.8.0', range: '0.8.0'},
          {version: '0.5.0', range: '0.5.0'}]);
      }).to.throw(Error, 'Failed to elect a version matching all the required ranges: [0.8.0, 0.5.0]');
    });

  });

});