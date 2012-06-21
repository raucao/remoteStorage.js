define(['./wireClient', './session', './store'], function(wireClient, session, store) {
  var prefix = '_remoteStorage_';
  function addToList(list, path, value) {
    var list, listStr = localStorage.getItem(prefix+list);
    if(listStr) {
      try {
        list = JSON.parse(listStr);
      } catch(e) {
      }
    }
    if(!list) {
      list = {};
    }
    if(list[path] != value) {
      list[path] = value;
      localStorage.setItem(prefix+list, JSON.stringify(list));
    }
  }
  function getStatus(path) {
    return 'disconnected';
  }
  function getUserAddress() {
    return null;
  }
  function getCurrentTimestamp() {
    return new Date().getTime();
  }
  function get(path, cb) {
    var fromCache = store.get(path);
    if(fromCache) {
      cb(null, fromCache);
    } else {
      wireClient.get(path, function(err, data) {
        if(getStatus(path) != 'disconnected') {
          store.set(path, data);
          addToList('pull', path, getCurrentTimeStamp());
        }
        cb(err, data);
      });
    }
  }
  return {
    markOutgoingChange : function(path) {
      addToList('push', path, getCurrentTimestamp());
    },
    addPath : function(path) {
      addToList('pull', path, 0);
    },
    getStatus : getStatus,
    getUserAddress : getUserAddress,
    get : get
  };
});
