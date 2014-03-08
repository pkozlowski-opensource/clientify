var expect = require('chai').expect;
var flattenDependencyTree = require("../lib/flattenDependencyTree");

describe('flattening the dependency tree', function () {

  it('should flatten a tree without dependencies', function () {
    expect(flattenDependencyTree({name: 'foo', version: '0.1.0'}))
      .to.deep.equal({});
  });

  it('should flatten a tree with one dependency assigning a parent', function () {
    expect(flattenDependencyTree({name: 'foo', version: '0.1.0', dependencies: [
      {name: 'bar', version: '0.0.2'}
    ]}))
      .to.deep.equal({bar: [{version: '0.0.2', parent: {name: 'foo', version: '0.1.0'}}]});
  });

  it('should capture dependencies on all levels', function () {
    expect(flattenDependencyTree({name: 'foo', version: '0.1.0', dependencies: [
      {name: 'bar', version: '0.0.2'},
      {name: 'baz', version: '0.0.2', dependencies: [
        {name: 'bar', version: '0.0.3'}
      ]}
    ]}))
      .to.deep.equal({
        bar: [{version: '0.0.2', parent: {name: 'foo', version: '0.1.0'}}, {version: '0.0.3', parent: {name: 'baz', version: '0.0.2'}}],
        baz: [{version: '0.0.2', parent: {name: 'foo', version: '0.1.0'}}]
      });
  });

});