define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/simple', './lib/webfinger', './lib/hardcoded', './lib/widget',
    './lib/baseClient', './lib/wireClient'],
  function (require, platform, couch, dav, simple, webfinger, hardcoded, widget, baseClient, wireClient) {
    var modules = {
      },
      defineModule = function(moduleName, version, module) {
        modules[moduleName+'-'+version] = module;
      },
      loadModule = function(moduleName, version, mode) {
        if(this[moduleName]) {
          return;
        }
        if(version=='0.0' || typeof(version) == 'undefined') {
          this[moduleName] = baseClient.create(moduleName);//will check for updates every minute, if wireClient is connected
        } else {
          this[moduleName] = modules[moduleName+'-'+version](baseClient.create(moduleName));//will check for updates every minute, if wireClient is connected
        }
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
