define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/getputdelete', './lib/webfinger', './lib/hardcoded', './lib/session', './lib/widget',
    './lib/baseClient', './lib/wireClient', './modules/tasks-0.1.js'],
  function (require, platform, couch, dav, getputdelete, webfinger, hardcoded, session, widget, baseClient, wireClient, tasksModule) {
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
        session.addScope(moduleName+':'+mode);
      };
  return {
    displayWidget : widget.display,
    defineModule  : defineModule,
    loadModule    : loadModule
  };
});
