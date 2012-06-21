define([], function () {
  var onChange,
    prefix = 'remote_storage_store:',
    memCache = {};
  window.addEventListener('storage', function(e) {
    if(e.key.substring(0, prefix.length == prefix)) {
      e.path = e.key.substring(prefix.length);
      e.origin='device';
      if(memCache[path]) {//should use null for negative caching!
        delete memCache[path];
      }
      if(onChange) {
        onChange(e);
      }
    }
  });
  function get(path) {
    var valueStr = memCache[path];
    if(typeof(valueStr) == 'undefined') {//null is used for negative caching!
      valueStr = memCache[path] = localStorage.getItem(prefix+path);
    }
    if(isDir(path)) {
      if(valueStr) {
        var value;
        try {
          value = JSON.parse(valueStr);
        } catch(e) {
        }
        if(!value) {
          value = rebuildNow(path);
          memCache[path]=JSON.stringify(value);
          localStorage.setItem(prefix+path, memCache[path]);
        }
        return value;
      } else {
        return {};
      }
    } else {
      return valueStr;
    }
  }
  function isDir(path) {
    return path.substr(-1) == '/';
  }
  function getContainingDir(path) {
    // '' 'a' 'a/' 'a/b' 'a/b/' 'a/b/c' 'a/b/c/'
    var parts = path.split('/');
    // [''] ['a'] ['a', ''] ['a', 'b'] ['a', 'b', ''] ['a', 'b', 'c'] ['a', 'b', 'c', ''] 
    if(!parts[parts.length-1].length) {//last part is empty, so string was empty or had a trailing slash
      parts.pop();
    }
    // [] ['a'] ['a'] ['a', 'b'] ['a', 'b'] ['a', 'b', 'c'] ['a', 'b', 'c']
    if(parts.length) {//remove the filename or dirname
      parts.pop();
      // - [] [] ['a'] ['a'] ['a', 'b'] ['a', 'b']
      return parts.join('/')+(parts.length?'/':'');
      // - '' '' 'a/' 'a/' 'a/b/' 'a/b/'
    }
    return undefined;
    // undefined - - - - - -
  }
  function getFileName(path) {
    var parts = path.split('/');
    if(isDir(path)) {
      return parts[parts.length-2]+'/';
    } else {
      return parts[parts.length-1];
    }
  }
  function getCurrTimestamp() {
    return new Date().getTime();
  }
  function rebuildNow(path) {
    var obj = {};
    for(var i=0; i<localStorage.length; i++) {
      var key = localStorage.key(i);
      if(key.length > prefix.length+path.length && key.substr(0, prefix.length+path.length)==prefix+path) {
        obj[getFileName(key)]=getCurrTimestamp();
      }
    }
    for(var key in memCache) {
      if(key.length > prefix.length+path.length && key.substr(0, prefix.length+path.length)==prefix+path) {
        obj[getFileName(key)]=getCurrTimestamp();
      }
    }
    return obj;
  }
  function storeSet(path, valueStr) {
    if(typeof(valueStr) == 'undefined') {
      return storeRemove(path);
    }
    var containingDir = getContainingDir(path);
    if(containingDir) {
      currIndex = get(containingDir);
      currIndex[getFileName(path)] = getCurrTimestamp();
      storeSet(containingDir, JSON.stringify(currIndex));
    }
    memCache[path] = valueStr;
    localStorage.setItem(prefix+path, valueStr);
  }
  function storeRemove(path) {
    var containingDir = getContainingDir(path);
    if(containingDir) {
      var fileName = getFileName(path);
      currIndex = get(containingDir);
      if(currIndex[fileName]) {
        delete currIndex[fileName];
        storeSet(containingDir, JSON.stringify(currIndex));
      }
    }
    memCache[path] = null;//negative caching
    localStorage.removeItem(prefix+path);
  }
  function on(eventName, cb) {
    if(eventName=='change') {
      onChange = cb;
    }
  }
  function set(absPath, valueStr) {
    var ret = storeSet(absPath, valueStr);
    onChange({
      origin: 'tab',
      path: absPath,
      oldValue: get(absPath),
      newValue: valueStr
    });
    return ret; 
  }
  function remove(absPath) {
    return set(absPath, undefined);
  }
  function connect(path, connectVal) {
    sync.addPath(path, connectVal);
    sync.work();
  }
  function getState(path) {
    return 'disconnected';
  }
  function storeObject(path, type, obj) {
    set(path, JSON.stringify(obj));
  }
  function storeMedia(path, mimeType, data) {
    set(path, data);
  }
  return {
    on: on,//error,change(origin=tab,device,cloud)
    
    get      : get,
    set      : set
  };
});
