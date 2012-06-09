define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/simple', './lib/webfinger', './lib/hardcoded', './lib/widget', './lib/syncClient'],
  function (require, platform, couch, dav, simple, webfinger, hardcoded, widget, syncClient) {

    var modules = {
      },
      scopes = {},
      defineModule = function(moduleName, version, module) {
        modules[moduleName+'-'+version] = module;
      },
      loadModule = function(moduleName, version, mode) {
        scopes[moduleName] = (mode?mode:'rw');
        if(version=='0.0' || typeof(version) == 'undefined') {
          this[moduleName] = syncClient.create(moduleName);
        } else {
          this[moduleName] = modules[moduleName+'-'+version](syncClient.create(moduleName));
        }
      };
  return {
    displayWidget : widget.display,
    defineModule  : defineModule,
    loadModule    : loadModule
    //discoverEndPoints  : widget.discoverEndPoints,
    //setStorageInfo     : widget.setStorageInfo
  };
});
