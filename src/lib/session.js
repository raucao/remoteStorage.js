//server timestamps should overwrite local timestamps, even if they are older.
//when logging in with rw, it should add an entry with a random string to a 'rw-sessions' key and then read the timestamp back
//after that, it can display 'other sessions' and also ping this key every 15 minutes to say it's still online.
//when a notifySet or notifyRemove comes from a module, it is always added to the queue, with either a string or undefined as its value, and depending on the state, it gets processed immediately.
//the queue only exists in memory, and is rebuilt periodically based on get of everything.
//so make sure you don't put more than 10 items in a dir.
//a PUT or DELETE should return the revision in get-put-delete
//for webdav we just PUT whenever we think this is necessary, and then read back all changes (including our own ones).


// other devices - remote - local cache of remote master - local changes - memcache
//                       WIRE                          SESSION         BASE


// when changes come in, it is decided based on timestamp whether a local changes entry should be created, or it should go straight into memcache and trigger an onchange, or a local changes entry should be removed because a write was successful

//baseClient.get()
//baseClient.set()
//baseClient.remove()
//baseClient.connect()//connect local with remote
//baseClient.getStatus() //'unconnected', 'connecting', 'read-only', 'connected'


//there's a difference between 'known to be undefined remotely' and 'unknown'. this is indicated with dirList undefined or dirList empty? or provide baseClient.isSynced(path)
//there should be a 'demo', 'unsynced', 'syncing', and 'synced' state.
//or synced should be per subtree, with states 'no account', 'not trying', 'no connectivity', 'syncing', 'synced'
//this can be added into the dirtree.
//so get dir list would say per item when it was last modified remotely (if known), when it was last fetched, when it was last changed locally. and there should be an 'expulse' method. 'hasLocalChanges' boolean. 'isCached' boolean. the age of cache and whether we are online should not be displayed per dir, i think. type can also be displayed in the listing if known.

//changed: (and cached)
//cached: (but not changed)
//local: (changed but not cached)

//logged in or not is a global choice; if you log in, some keys will go from local changes to local cache, and some will come from remote to local cache and trigger updates. so modules should not set empty state scaffolding.
//
//a folder can either be disconnected, connecting, or connected. if it's connected, then there still may be pending local changes, that's irrelevant.
//what matters is if the UI can display the local copy as it is, or should display 'loading' in the pane, or should display 'demo mode'.

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
  function notifySet(path, valueStr) {
    state.dirty[path]=valueStr;
    if(state.idle) {
      work();
    }
  }
  function notifyRemove(path) {
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
