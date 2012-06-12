//this is the base module. it is the basis for specific modules, and deals with coordinating the cache, events from other tabs, and all wire traffic with the cloud
define(['./cache'], function (cache, storageEventClient, wireClient) {
  function create(moduleName, syncInterval) {
    var handlers = { changed: []},
      prefix = 'remote_storage_cache:';
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
    window.addEventListener('storage', function(e) {
      if(e.key.substring(0, prefix.length == prefix)) {
        e.path = e.key.substring(prefix.length);
        e.origin='device';
      }
      if(forThisModule(e)) {
        fire(e);
      }
    });
    function cacheGet(path) {
      return localStorage.getItem(prefix+path);
    },
    function cacheSet(path, valueStr) {
      return localStorage.setItem(prefix+path, valueStr);
    },
    function cacheRemove(path) {
      return localStorage.removeItem(prefix+path);
    },
    function on(eventName, cb) {
      if(eventName=='changed') {
        handlers.changed.push(cb);
      }
    }
    function getPrivate(path) {
      return cacheGet(moduleName+'/'+path);
    }
    function getPublic(path) {
      return cacheGet('public/'+moduleName+'/'+path);
    }
    function setPrivate(path, valueStr) {
      return cacheSet(moduleName+'/'+path, valueStr);
    }
    function setPublic(path, valueStr) {
      return cacheSet('public/'+moduleName+'/'+path, valueStr);
    }
    function set(absPath, valueStr) {
      session.notifySet(absPath, valueStr, function(err) {
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
      session.notifyRemove(absPath, function(err) {
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
    function push(path) {
      if(path.substr(-1) == '/') {
        doSync(path);
      } else {
        session.notifySet(path, cacheGet(path));
      }
    }
    function pull(path) {
      if(key.substr(-1) == '/') {
        sync(path);
      } else {
        session.getRemote(path, function(err, data) {
          if(err) {
            fire('error', err);
          } else {
            cacheSet(path, data);
          }
        });
      }
    }
    function doMerge(path, localIndex, remoteIndex) {
      for(var key in localIndex) {
        if(localIndex[key] > remoteIndex[key]) {
          push(path+'/'+key);
        }
      }
      for(var key in remoteIndex) {
        if(remoteIndex[key] > localIndex[key]) {
          pull(path+'/'+key);
        }
      }
    }
    function doSync(path) {
      session.remoteGet(path, function(err, data) {
        if(err) {
          fire('error', err);
        } else {
          doMerge(path, cacheGet(path), data);
        }
      });
    }
    function syncNow() {
      doSync(moduleName+'/');
      doSync('public/'+moduleName+'/');
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
});
