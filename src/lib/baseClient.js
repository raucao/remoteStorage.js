define(['./sync', './store'], function (sync, store) {
  var moduleChangeHandlers = {};
  function extractModuleName(path) {
    if (path && typeof(path) == 'string') {
      var parts = path.split('/');
      if(parts.length > 3 && parts[1] == 'public') {
        return parts[2];
      } else if(parts.length > 2){
        return parts[1];
      }
    }
  }
  store.on('change', function(eventObj) {//tab-, device- and cloud-based changes all get fired from the store.
    var moduleName = extractModuleName(eventObj.path);
    if(moduleName && moduleChangeHandlers[moduleName]) {
      moduleChangeHandlers[moduleName](eventObj);
    }
  });
  function set(absPath, valueStr) {
    var node = store.getNode(absPath);
    node.data = valueStr;
    node.outgoingChange = true;
    var ret = store.updateNode(absPath, node);
    return ret; 
  }
  function makePath(moduleName, version, path, public, userAddress) {
    return (userAddress ?'//'+userAddress:'/')+(public?'public/':'')+moduleName+'/'+version+'/'+path;
  }
  function claimAccess(path, claim) {
    var node = store.getNode(path);
    store.access = claim;
    store.updateNode(path);
  }
  return {
    getInstance : function(moduleName, version, accessClaim) {
      claimAccess('/'+moduleName+'/'+version+'/', accessClaim);
      claimAccess('/public/'+moduleName+'/'+version+'/', accessClaim);
      return {
        on          : function(eventType, cb) {//'error' or 'change'. Change events have a path and origin (tab, device, cloud) field
          if(eventType=='change') {
            moduleChangeHandlers[moduleName] = cb;
          }
        },
        get         : function(path, public, userAddress, cb) {
          if(cb) {
            sync.fetchNow(makePath(moduleName, version, path, public, userAddress), function(err) {
              var node = store.getNode(makePath(moduleName, version, path, public, userAddress));
              cb(node.data);
            });
          } else {
            var node = store.getNode(makePath(moduleName, version, path, public, userAddress));
            return node.data;
          }
        },
        remove      : function(path, public) {
          return set(makePath(moduleName, version, path, public), undefined);
        },
        
        storeObject : function(path, public, type, obj) {
          obj['@type'] = 'https://remotestoragejs.com/spec/modules/'+type;
          //checkFields(obj);
          return set(makePath(moduleName, version, path, public), JSON.stringify(obj));
        },
        storeMedia  : function(path, mimeType, data) {
          return set(makePath(moduleName, version, path, public), data);
        },
        
        connect     : function(path, public, userAddress, switchVal) {
          var absPath = makePath(moduleName, version, path, public, userAddress);
          var node = store.getNode(absPath);
          node.startForcing = (switchVal != false);
          store.updateNode(absPath, node);
        },
        getState    : function(path, public, userAddress, switchVal) {
        }
      };
    }
  };
});
