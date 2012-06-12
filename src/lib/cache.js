define([], function() {
  var handlers = { changed: []},
    prefix = 'remote_storage_cache:';
  function fire(eventName, eventObj) {
    if(handlers[eventName]) {
      for(var i=0; i<handlers[eventName].length; i++) {
        handlers[eventName][i](eventObj);
      }
    }
  }
  window.addEventListener('storage', function(e) {
    if(e.key.substring(0, prefix.length == prefix)) {
      e.path = e.key.substring(prefix.length);
    }
    fire(e);
  });
  return {
    get: function(path) {
      return localStorage.getItem(prefix+path);
    },
    set: function(path, valueStr) {
      return localStorage.setItem(prefix+path, valueStr);
    },
    remove: function(path) {
      return localStorage.removeItem(prefix+path);
    },
    on: function(eventName, cb) {
      if(eventName=='changed') {
        handlers.changed.push(cb);
      }
    }
  };
});
