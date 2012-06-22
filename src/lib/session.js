define(['./platform', './webfinger', './hardcoded'], function(platform, webfinger, hardcoded) {
  var prefix = 'remoteStorage_session_',
    memCache = {},
    scopes = [];
  function set(key, value) {
    localStorage.setItem(prefix+key, JSON.stringify(value));
    memCache[key]=value;
  }
  function get(key) {
    if(typeof(memCache[key]) == 'undefined') {
      var valStr = localStorage.getItem(prefix+key);
      if(typeof(valStr) == 'string') {
        try {
          memCache[key] = JSON.parse(valStr);
        } catch(e) {
          localStorage.removeItem(prefix+key);
          memCache[key] = null;
        }
      }
    } else {
      memCache[key] = null;
    }
    return memCache[key];
  }
  function discoverStorageInfo(cb) {
    webfinger.getStorageInfo(get('userAddress'), function(err, data) {
      if(err) {
        hardcoded.guessStorageInfo(get('userAddress'), function(err2, data2) {
          if(err2) {
            cb(err2);
          } else {
            set('storageInfo', data2);
            cb(null);
          }
        });
      } else {
        set('storageInfo', data);
        cb(null);
      }
    });
  }
  function dance(cb) {
    platform.setLocation(get('storageInfo').properties.authHref
      +'?scope='+encodeURIComponent(get('scopes')));
  }
  function onLoad() {
    var tokenHarvested = platform.harvestToken();
    if(tokenHarvested) {
      set('token', tokenHarvested);
    }
  }
  function addScope(scope) {
    scopes.push(scope);
  }
  function getState() {
    return 'anonymous';
  }
  function on(eventType, cb) {
  }

  onLoad();
  
  return {
    get   : get,
    set   : set,
    discover : dance,
    addScope : addScope,
    getState : getState,
    on : on
  }
});
