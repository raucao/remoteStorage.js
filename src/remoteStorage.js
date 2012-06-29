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
      },
      loadModuleAsync = function(moduleName, version, mode, cb) {
        var moduleXhr = new XMLHttpRequest();
        var remoteStorage = this;
        moduleXhr.open('GET', '../../src/modules/tasks-0.1.js', true);
        moduleXhr.onreadystatechange = function() {
          if(moduleXhr.readyState == 4 && moduleXhr.status == 200) {
            eval(moduleXhr.responseText);//how to do this properly? if you know, please send a pull request! :)      
            loadModule(moduleName, version, mode);
            cb();
          }
        };
        moduleXhr.send();
      };
  return {
    displayWidget   : widget.display,
    defineModule    : defineModule,
    loadModule      : loadModule,
    loadModuleAsync : loadModuleAsync
  };
});
