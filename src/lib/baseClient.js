//this is the base module. it is the basis for specific modules, and deals with coordinating the cache, events from other tabs, and all wire traffic with the cloud
define(['./cache', './wireClient'], function (cache, storageEventClient, wireClient) {
  function create(moduleName, syncInterval) {
    var handlers={};
    function fire(eventName, eventObj) {
      if(handlers[eventName]) {
        for(var i=0; i<handlers[eventName].length; i++) {
          handlers[eventName][i](eventObj);
        }
      }
    }
    function forThisModule(e) {
      return (e && e.path && typeof(e.path) == 'string' && (
        e.path.substring(0, moduleName.length+1) == moduleName+'/'
        ||e.path.substring(0, 'public/'.length+moduleName.length+1) == 'public/'+moduleName+'/'
      ));
    }
    cache.on('change', function(e) {
      if(forThisModule(e)) {
        e.origin='device';
        fire('change', e);
      }
    });
    wireClient.on('change', function(e) {
      if(forThisModule(e)) {
        e.origin='cloud';
        fire('change', e);
      }
    });
    function getPrivate(path) {
      return cache.get(moduleName+'/'+path);
    }
    function getPublic(path) {
      return cache.get('public/'+moduleName+'/'+path);
    }
    function setPrivate(path, valueStr) {
      return set(moduleName+'/'+path, valueStr);
    }
    function setPublic(path, valueStr) {
      return set('public/'+moduleName+'/'+path, valueStr);
    }
    function set(absPath, valueStr) {
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
    function removePrivate(path) {
      remove(moduleName+'/'+path);
    }
    function removePublic(path) {
      remove('public/'+moduleName+'/'+path);
    }
    function remove(path) {
      wireClient.remove(absPath, function(err) {
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
      return cache.remove(absPath);
    }
    function syncNow() {
      //...
    }
    setTimeout(syncNow, 0);//allow the current code execution to register the necessary handlers, then immediately (after a 0ms delay) start syncing
    setInterval(syncNow, syncInterval);//check for updates from other devices periodically
    
    return {
      on: on,//error,change(origin=tab,device,cloud)
      
      getPrivate: getPrivate,
      set: setPrivate,
      removePrivate: removePrivate,

      getPublic: getPublic,
      setPublic: setPublic,
      removePublic: removePublic,
      
      syncNow: syncNow
    };
  }
  
  return {
    create: create
  };
})();
