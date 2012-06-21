define(['./sync', './store'], function (sync, store) {
  var moduleChangeHandlers = {};
  function extractModuleName(path) {
    if (path && typeof(path) == 'string') {
      var parts = path.split('/');
      if(parts.length > 2 && parts[0] == 'public') {
        return parts[1];
      } else if(parts.length > 1){
        return parts[0];
      }
    }
  }
  store.on('change', function(e) {//tab-, device- and cloud-based changes all get fired from the store.
    var moduleName = extractModuleName(e.path);
    if(moduleName && moduleChangeHandlers[moduleName]) {
      moduleChangeHandlers[moduleName](eventObj);
    }
  });
  function set(absPath, valueStr) {
    var ret = store.set(absPath, valueStr);
    sync.markOutgoingChange(absPath);
    return ret; 
  }
  function connect(path, connectVal) {
    sync.addPath(path, connectVal);
  }
  function getState(path) {
    return sync.getState(path);
  }
  function makePath(moduleName, path, public, userAddress) {
    return (userAddress && userAddress != sync.getUserAddress() ?'//'+userAddress:'/')+(public?'public/':'')+moduleName+'/'+path;
  }
  return {
    getInstance : function(moduleName) {
      return {
        on          : function(eventType, cb) {//'error' or 'change'. Change events have a path and origin (tab, device, cloud) field
          if(eventType=='change') {
            moduleChangeHandlers[moduleName] = cb;
          }
        },
        get         : function(path, public, userAddress, cb) {
          if(cb) {
            return sync.get(makePath(moduleName, path, public, userAddress), cb);
          } else {
            return store.get(makePath(moduleName, path, public, userAddress));
          }
        },
        remove      : function(path, public) {
          return set(makePath(moduleName, path, public), undefined);
        },
        
        storeObject : function(path, public, obj) {
          return set(makePath(moduleName, path, public), JSON.stringify(obj));
        },
        storeMedia  : function(path, mimeType, data) {
          return set(makePath(moduleName, path, public), data);
        },
        
        connect     : function(path, public, userAddress, switchVal) {
          return sync.addPath(makePath(moduleName, path, public, userAddress), switchVal);
        },
        getState    : function(path, public, userAddress, switchVal) {
          return sync.getState(makePath(moduleName, path, public, userAddress), switchVal);
        }
      };
    }
  };
});
