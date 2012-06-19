define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/simple', './lib/webfinger', './lib/hardcoded', './lib/widget',
    './lib/baseClient', './lib/wireClient', './modules/tasks-0.1.js'],
  function (require, platform, couch, dav, simple, webfinger, hardcoded, widget, baseClient, wireClient, tasksModule) {
    var modules = {
        'tasks-0.1': tasksModule
      },
      defineModule = function(moduleName, version, module) {
        modules[moduleName+'-'+version] = module;
      },
      loadModule = function(moduleName, version, mode) {
        if(this[moduleName]) {
          return;
        }
        this[moduleName] = modules[moduleName+'-'+version].exports;
        if(mode != 'r') {
          mode='rw';
        }
        widget.addScope(moduleName+':'+mode);
      };
  return {
    displayWidget : widget.display,
    defineModule  : defineModule,
    loadModule    : loadModule
  };
});
