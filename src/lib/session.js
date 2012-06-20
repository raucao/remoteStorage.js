define(['./wireClient', './webfinger', './hardcoded'], function(wireClient, webfinger, hardcoded) {
  var state, stateKey = '_remoteStorageSession', handlers={};
  function loadState() {
    state={dirty: {}};
    var stateStr = localStorage.getItem(stateKey);
    if(stateStr) {
      try {
        state=JSON.parse(stateStr);
      } catch(e) {
      }
    }
  }
  function setUserAddress(userAddress) {
    state.userAddress = userAddress;
    localStorage.setItem(stateKey, JSON.stringify(state));
    discover();
  }
  function setBearerToken(bearerToken) {
    state.bearerToken = bearerToken;
    localStorage.setItem(stateKey, JSON.stringify(state));
  }
  function on(eventType, cb) {
    if(!handlers[eventType]) {
      handlers[eventType] = [];
    }
    handlers[eventType].push(cb);
  }
  var lastTime={
    sync: 0,
    push: 0
  };
  function maybe(what, cb) {
    var now = new Date().getTime();
    if(lastTime[what] && lastTime[what]+60000 > now) {
      lastTime[what] = now;
      var list, listStr = localStorage.getItem('remote_storage_'+what);
      if(listStr) {
        try {
          list = JSON.parse(listStr);
          for(var i in list) {
            cb(i, list[i]);
          }
        } catch(e) {
        }
      }
    }
  }
  function pull(path, timestamp) {
    wireClient.get(path, function(err, data) {
      if(!err) {
        if(paths.substr(-1)=='/') {
          for(var i in data) {
            if(data[i]>timestamp) {
              pull(path+i, timestamp);
            }
          }
        } else {
          localStorage.setItem(prefix+path, data);
        }
      }
    });
  }
  function push(path) {
    wireClient.put(path, localStorage.getItem(prefix+path), function(err) {
      if(!err) {
        removeFromlist(path, 'push');
      }
    });
  }
  function work() {
    if(isConnected()) {
      maybe('pull', pull);
      maybe('push', push);
    }
  }
  function remoteGet(path, cb) {
  }
  loadState();
  return {
    setUserAddress      : setUserAddress,
    setBearerToken      : setBearerToken,
    on                  : on,
    notifySet           : notifySet,
    notifyRemove        : notifyRemove,
    remoteGet           : remoteGet
  };
});
