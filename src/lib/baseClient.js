//this is the base module. it is the basis for specific modules, and deals with coordinating the cache, events from other tabs, and all wire traffic with the cloud
define([], function () {
  function create(moduleName, cache, storageEventClient, wireClient) {
    var handlers={};
    function fire(eventName, eventObj) {
      if(handlers[eventName]) {
        for(var i=0; i<handlers[eventName].length; i++) {
          handlers[eventName][i](eventObj);
        }
      }
    }
    storageEventClient.on('change', function(e) {
      e.origin='device';
      fire('change', e);
    });
    wireClient.on('change', function(e) {
      e.origin='cloud';
      fire('change', e);
    });
    function get(path) {
      return cache.get(moduleName+'/'+path);
    }
    function set(path, valueStr) {
      var absPath = moduleName+'/'+path;
      wireClient.set(absPath, valueStr, function(err) {
        if(err) {
          fire('error', err);
        }
      });
      fire('change', {
        origin: 'tab',
        path: absPath,
        oldValue: cache.get(absPath),
        newValue: valueStr
      });
      return cache.set(absPath, valueStr);
    }
    function delete_(path) {
      var absPath = moduleName+'/'+path;
      wireClient.delete(absPath, function(err) {
        if(err) {
          fire('error', err);
        }
      });
      fire('change', {
        origin: 'tab',
        path: absPath,
        oldValue: cache.get(absPath),
        newValue: undefined
      });
      return cache.delete(absPath);
    }
    function syncNow() {
      //...
    }
    return {
      on: on,//error,change(origin=tab,device,cloud)
      get: get,
      set: set,
      'delete': delete_,
      syncNow: syncNow
    };
  }
  
  return {
    create: create
  };
})();
