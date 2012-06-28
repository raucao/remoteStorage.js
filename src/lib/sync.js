define(['./wireClient', './session', './store'], function(wireClient, session, store) {
  var prefix = '_remoteStorage_', busy=false;
   
  function addToList(listName, path, value) {
    var list = getList(listName);
    if(list[path] != value) {
      list[path] = value;
      localStorage.setItem(prefix+listName, JSON.stringify(list));
    }
  }
  function getList(listName) {
    var list, listStr = localStorage.getItem(prefix+listName);
    if(listStr) {
      try {
        return JSON.parse(listStr);
      } catch(e) {
      }
    }
    return {};
  }
  function getState(path) {
    if(session.getState() == 'connected') {
      if(busy) {
        return 'busy';
      } else {
        return 'connected';
      }
    } else {
      return 'anonymous';
    }
  }
  //as you pull in the new timestamps for a directory, you can always update the local copy, because the values in there are always from the last pull.
  //additionally, the ones that didn't change, you will not have to check. the ones that are newer than what we have should be added to the 'news' list.
  //we should start syncing with the least common prefix of all pull paths.
  //start: synced: '', pulling: '/', dirty: '/a/b', '/a/v/d', '/a/v/e'
  //pull '/', compare with current. if 'a/' gets updated, we pull /a/:
  //synced: '/', pulling: 'a/', dirty: '/a/b', '/a/v/d', '/a/v/e'
  //if 'a/' gets updated,
  //synced: '/a/', pulling: '/a/b/', dirty: '/a/b', '/a/v/d', '/a/v/e'
  //if 'b' gets updated,
  //synced: '/a/b', pulling: '/a/v/', dirty: '/a/v/d', '/a/v/e'
  //if 'd' gets updated but 'e' doesn't,
  //synced: ['/a/b', '/a/v/e'], pulling: '/a/v/d', dirty: '/a/v/d'
  //
  //we have a list of paths that should be kept in sync, mapped to the last time they were synced.
  //- take all containing dirs of paths in that list, and make sure they are there too.
  function containingDir(path) {
    var pathParts = path.split('/');
    if(path.substr(-1)=='/') {
      pathParts.pop();
    }
    if(pathParts.length) {
      pathParts.pop();
      return pathParts.join('/');
    }
  }
  function buildTree(listName) {
    var list = getList(listName);
    var changed = false;
    do {
      for(var i in nodes) {
        var containingDir = getContainingDir(i);
        if(containingDir && !list[containingDir]) {
          if(!list[containingDir]) {
            list[containingDir] = {
              path: containingDir,
              chidren: []
            };
          }
          list[containingDir].children.push(node);
        }
      }
    } while(changed);
    var nodes = [];
    for(var i in list) {
      nodes.push(i);
    }
    return nodes.sort(function(a, b) {
      return (a.length - b.length);
    });
  }
  function pull() {
    var pullTree = buildTree('pull');//list of node objects. each node has a .path and a .children.
    for(var i=0; i<pullTree.length; i++) {
      pullNode(list[i]);
    }
  }
  function pullNode(node) {
    wireClient.get(node.path, function(err, data) {
      var changedElts = handleIncoming(node.path, data);
      for(var i in node.children) {//this will launch concurrent requests
        if(changeElts.indexOf(i)!=-1) {
          pullNode(children[i]);
        }
      }
    });
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
        if(getState(path) != 'disconnected') {
          store.set(path, data);
          addToList('pull', path, getCurrentTimeStamp());
        }
        cb(err, data);
      });
    }
  }
  function on(eventType, cb) {
  }
  return {
    markOutgoingChange : function(path) {
      addToList('push', path, getCurrentTimestamp());
    },
    addPath : function(path) {
      addToList('pull', path, 0);
    },
    getState : getState,
    getUserAddress : getUserAddress,
    get : get,
    on : on
  };
});
