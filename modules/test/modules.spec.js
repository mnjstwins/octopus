const fixtures = require('octopus-test-utils'),
  {expect} = require('chai').use(require('chai-shallow-deep-equal')),
  emitModules = require('..').modules,
  {resolve} = require('path');

describe('modules', () => {

  it('should traverse into private package, but not include it', () => {
    const project = fixtures.empty()
      .packageJson({name: 'root', private: true, dependencies: {name: 'a', version: '1.0.0'}})
      .module('a', module => module.packageJson({name: 'a', version: '1.0.0'}))
      .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'a': '~1.0.0'}}));

    expect(emitModuleNames(project.dir)).to.deep.equal(['a', 'b']);
  });

  it('should not traverse into module that is not private', () => {
    const project = fixtures.empty()
      .packageJson({name: 'root', dependencies: {name: 'a', version: '1.0.0'}})
      .module('a', module => module.packageJson({name: 'a', version: '1.0.0'}))
      .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'a': '~1.0.0'}}));

    expect(emitModuleNames(project.dir)).to.deep.equal(['root']);
  });

  it('should traverse into nested private module', () => {
    const project = fixtures.empty()
      .module('a', module => {
        module.packageJson({name: 'a', version: '1.0.0', private: true});
        module.module('c', module => module.packageJson({name: 'c', version: '1.0.0'}));
      })
      .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'c': '~1.0.0'}}));

    expect(emitModuleNames(project.dir)).to.deep.equal(['c', 'b']);
  });

  it('should build correct dependency order', () => {
    const project = fixtures.empty()
      .module('a', module => module.packageJson({name: 'a', version: '1.0.0'}))
      .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'a': '~1.0.0'}}))
      .module('c', module => module.packageJson({version: '1.0.0', dependencies: {'b': '~1.0.0'}}));

    expect(emitModuleNames(project.dir)).to.deep.equal(['a', 'b', 'c']);
  });

  it('should fail for cyclic graph', () => {
    const project = fixtures.empty()
      .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'c': '~1.0.0'}}))
      .module('c', module => module.packageJson({version: '1.0.0', dependencies: {'b': '~1.0.0'}}));

    expect(() => emitModuleNames(project.dir)).to.throw('Cycles detected in dependency graph');
  });

  describe('modules', () => {

    it('should build modules with dependencies', () => {
      const project = fixtures.empty()
        .module('b', module => module.packageJson({version: '1.0.0', dependencies: {'c': '~1.0.0'}}))
        .module('c', module => module.packageJson({version: '1.0.0'}));

      expect(emitModules(project.dir)).to.shallowDeepEqual([
        {name: 'c', path: resolve(project.dir, './c'), version: '1.0.0', dependencies: []},
        {
          name: 'b', path: resolve(project.dir, './b'), version: '1.0.0', dependencies: [
          {name: 'c', path: resolve(project.dir, './c')}]
        }
      ])
    });
  });

  function emitModuleNames(dir) {
    return emitModules(dir).map(module => module.name);
  }
});
