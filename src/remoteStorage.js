define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/getputdelete', './lib/webfinger', './lib/hardcoded', './lib/session', './lib/widget',
    './lib/baseClient', './lib/wireClient'],
  function (require, platform, couch, dav, getputdelete, webfinger, hardcoded, session, widget, baseClient, wireClient) {
    var modules = {},
      defineModule = function(moduleName, version, module) {
        modules[moduleName+'-'+version] = module(baseClient.getInstance(moduleName, version));
      },
      loadModule = function(moduleName, version, mode) {
        if(this[moduleName]) {
          return;
        }
        this[moduleName] = modules[moduleName+'-'+version].exports;
        if(mode != 'r') {
          mode='rw';
        }
        if(mode == 'rw') {
          session.addScope('/'+moduleName+'/'+version+'/:'+mode);
          session.addScope('/public/'+moduleName+'/'+version+'/:'+mode);
        }
        session.addScope('/'+moduleName+'/:r');
        session.addScope('/public/'+moduleName+'/:r');
      };
  return {
    displayWidget : widget.display,
    defineModule  : defineModule,
    loadModule    : loadModule
  };
});
