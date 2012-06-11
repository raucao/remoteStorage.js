define(
  ['require', './platform', './couch', './dav', './simple'],
  function (require, platform, couch, dav, simple) {
    var getDriver = function (type, cb) {
        if(type === 'https://www.w3.org/community/rww/wiki/read-write-web-00#couchdb'
          || type === 'https://www.w3.org/community/unhosted/wiki/remotestorage-2011.10#couchdb') {
          cb(couch);
        } else if(type === 'https://www.w3.org/community/rww/wiki/read-write-web-00#webdav'
          || type === 'https://www.w3.org/community/unhosted/wiki/remotestorage-2011.10#webdav') {
          cb(dav);
        } else {
          cb(simple);
        }
      },
      resolveKey = function(storageInfo, basePath, relPath, nodirs) {
        var itemPathParts = ((basePath.length?(basePath + '/'):'') + relPath).split('/');
        var item = itemPathParts.splice(1).join(nodirs ? '_' : '/');
        return storageInfo.href + '/' + itemPathParts[0]
          + (storageInfo.properties.legacySuffix ? storageInfo.properties.legacySuffix : '')
          + '/' + (item[0] == '_' ? 'u' : '') + item;
      },
      create = function (storageInfo, basePath, token) {
        return {
          get: function (key, cb) {
            if(typeof(key) != 'string') {
              cb('argument "key" should be a string');
            } else {
              getDriver(storageInfo.type, function (d) {
                d.get(resolveKey(storageInfo, basePath, key, storageInfo.nodirs), token, cb);
              });
            }
          },
          put: function (key, value, cb) {
            if(typeof(key) != 'string') {
              cb('argument "key" should be a string');
            } else if(typeof(value) != 'string') {
              cb('argument "value" should be a string');
            } else {
              getDriver(storageInfo.type, function (d) {
                d.put(resolveKey(storageInfo, basePath, key, storageInfo.nodirs), value, token, cb);
              });
            }
          },
          'delete': function (key, cb) {
            if(typeof(key) != 'string') {
              cb('argument "key" should be a string');
            } else {
              getDriver(storageInfo.type, function (d) {
                d['delete'](resolveKey(storageInfo, basePath, key, storageInfo.nodirs), token, cb);
              });
            }
          },
          sync: function (path) {
          },
          on: function(eventName, handler) {
          }
        };
      };

  return {
    create : create
  };
});

  //sync.js itself:

  syncer = (function() {
    var indexCache = {};
    var indexKey;
    var readyState={};
    orsc=function(obj){console.log('ready state changed to:');console.log(obj);};
    oc=function(obj){console.log('incoming changeset:');console.log(obj);};
    ol=function(str){
      console.log(str);
    }
    function inspect() { 
      var inspectorgadget = document.getElementById('inspector-gadget');
      if(!inspectorgadget) {
        inspectorgadget = document.createElement('div');
        inspectorgadget.setAttribute('id', 'inspector-gadget');
        inspectorgadget.innerHTML = '<h1 style="font:bold 16px/32px sans-serif;">Inspector Gadget</h1><div id="inspector-log"></div>';
        inspectorgadget.setAttribute('style','position:fixed; display:block; bottom:0; left:0; padding:1em; background:#000; color:#ddd; opacity:.5; font:12px/20px monospace; z-index:99999; width:100%; max-height:200px; overflow:auto;');
        document.body.appendChild(inspectorgadget);
         ol = function(str) {
          document.getElementById('inspector-log').innerHTML = '<p>' + str + '</p>' + document.getElementById('inspector-log').innerHTML;
        };
      }
    }
    function changeReadyState(field, value) {
      readyState[field]=value;
      orsc(readyState);
    }
    //localStorage keys used by this lib:
    //_unhosted$userAddress
    //_unhosted$categories
    //_unhosted$storageInfo
    //_unhosted$bearerToken
    
    //_unhosted$pullInterval
    
    //_unhosted$lastPushStartTime
    //_unhosted$lastPullStartTime
    
    //_unhosted$lastPushEndTime
    //_unhosted$lastPullEndTime
   
    //for each [category]:
    //_unhosted$index:[category]

    function connect(userAddress, categories, pullInterval, dialogPath) {
      if(!typeof(userAddress) == 'string') {
        return false;
      }
      var parts = userAddress.split('@');
      if(parts.length != 2) {
        return false;
      }
      if(parts[1].split('.').length < 2) {
        return false;
      }
      ol('syncer.connect('
        +JSON.stringify(userAddress)+', '
        +JSON.stringify(categories)+', '
        +JSON.stringify(pullInterval)+', '
        +JSON.stringify(dialogPath)+');');
      if(localStorage['_unhosted$bearerToken']) {
        console.log('err: already connected');
        return;
      }
      if(typeof(dialogPath) === 'undefined') {
        dialogPath = 'syncer/dialog.html';
      }
      if(typeof(pullInterval) === 'undefined') {
        pullInterval = 60;
      }
      localStorage['_unhosted$userAddress'] = userAddress;
      localStorage['_unhosted$categories'] = JSON.stringify(categories);
      localStorage['_unhosted$pullInterval'] = pullInterval;
      window.open(dialogPath);
      window.addEventListener('storage', function(event) {
        if(event.key=='_unhosted$bearerToken' && event.newValue) {
          if(pullInterval) {
            setInterval(work, pullInterval*1000);//will first trigger a pull if it's time for that
          }
          changeReadyState('connected', true);
        }
        if(event.key=='_unhosted$dialogResult' && event.newValue) {
          try {
            console.log(JSON.parse(event.newValue));
          } catch(e) {
            console.log('unparseable dialog result');
          }
        }
      }, false);
      return true;
    }
    function parseObj(str) {
      var obj;
      try {
        obj = JSON.parse(str);
      } catch(e) {
      }
      if(obj) {//so str is parseable /and/ the result is not falsy
        return obj;
      } else {
        return {};
      }
    }
    function iterate(obj, itemCb, finishedCb, lastItem) {//helper function to async over an object's keys.
      if(typeof(obj) == 'object') {
        for(var thisItem in obj) {
          if(!lastItem) {
            itemCb(thisItem, function() {
              iterate(obj, itemCb, finishedCb, thisItem);
            });
            return;//execution will continue in the callback of itemCb
          } else if(thisItem == lastItem) {
            lastItem = undefined;//go execute on next one
          }
        }
      }
      finishedCb();
    }
    function pullIn(localIndex, remoteIndex, client, cb) {//iterates over remoteIndex, pulling where necessary
      iterate(remoteIndex, function(item, doneCb) {
        if(!localIndex[item] || localIndex[item] < remoteIndex[item]) {
          client.get(item+':'+remoteIndex[item], function(err, data) {
            if(!err) {
              var oldValue = localStorage[client.category+'$'+item];
              localIndex[item]=remoteIndex[item]
              localStorage[client.category+'$_index']=JSON.stringify(localIndex);
              localStorage[client.category+'$'+item]=data;
              oc({
                category: client.category,
                key: item,
                oldValue: oldValue,
                newValue: data,
                timestamp: remoteIndex[item]
              });
              ol(client.category+'$'+item+' <- '+data);
            }
            doneCb();
          });
        } else {
          doneCb();
        }
      }, cb);
    }
    function pushOut(localIndex, remoteIndex, client, cb) {//iterates over localIndex, pushing where necessary
      var havePushed=false;
      iterate(localIndex, function(item, doneCb) {
        if(!remoteIndex[item] || remoteIndex[item] < localIndex[item]) {
          client.put(item+':'+localIndex[item], localStorage[client.category+'$'+item], function(err) {
            if(err) {
              console.log('error pushing: '+err);
            } else {//success reported, so set remoteIndex timestamp to ours
              ol(client.category+'$'+item+' -> '+localStorage[client.category+'$'+item]);
              remoteIndex[item]=localIndex[item];
              havePushed=true;
            }
            doneCb();
          });
        } else {
          doneCb();
        }
      }, function() {
        if(havePushed) {
          client.put('_index', JSON.stringify(remoteIndex), function(err) {
            if(err) {
              console.log('error pushing index: '+err);
            }
            cb();
          });
        } else {
          cb();
        }
      });
    }
    function pullCategory(storageInfo, category, bearerToken, cb) {//calls pullIn, then pushOut for a category
      var client=remoteStorage.createClient(storageInfo, category, bearerToken);
      client.category = category;
      client.get('_index', function(err, data) {
        if(!err) {
          var remoteIndex=parseObj(data);
          var localIndex = parseObj(localStorage[category+'$_index']);
          pullIn(localIndex, remoteIndex, client, function() {
            pushOut(localIndex, remoteIndex, client, cb);
          });
        }
      });
    }
    function pullCategories(storageInfo, categories, bearerToken, cb) {//calls pullCategory once for every category
      if(categories.length) {
        var thisCat=categories.shift();
        pullCategory(storageInfo, thisCat, bearerToken, function() {
          pullCategories(storageInfo, categories, bearerToken, cb);
        });
      } else {
        cb();
      }
    }
    function pull(cb) {//gathers settings and calls pullCategories
      var categories, storageInfo, bearerToken;
      try {
        categories=JSON.parse(localStorage['_unhosted$categories']);
        storageInfo=JSON.parse(localStorage['_unhosted$storageInfo']);
        bearerToken=localStorage['_unhosted$bearerToken'];
      } catch(e) {
      }
      if(categories && storageInfo && bearerToken) {
        pullCategories(storageInfo, categories, bearerToken, cb);
      }
    }
    function maybePull(now, cb) {
      if(localStorage['_unhosted$bearerToken'] && localStorage['_unhosted$pullInterval']) {
        if(!localStorage['_unhosted$lastPullStartTime'] //never pulled yet
          || parseInt(localStorage['_unhosted$lastPullStartTime']) + localStorage['_unhosted$pullInterval']*1000 < now) {//time to pull
          localStorage['_unhosted$lastPullStartTime']=now;
          changeReadyState('syncing', true);
          pull(function() {
            changeReadyState('syncing', false);
            cb();
          });
        } else {
          changeReadyState('syncing', false);
          cb();
        }
      } else {
        changeReadyState('syncing', false);
        cb();
      }
    }
    function pushItem(category, key, timestamp, indexStr, valueStr, cb) {
      console.log('push '+category+'$'+key+': '+valueStr);
      if(category != '_unhosted') {
        var storageInfo, bearerToken;
        try {
          storageInfo=JSON.parse(localStorage['_unhosted$storageInfo']);
          bearerToken=localStorage['_unhosted$bearerToken'];
        } catch(e) {
        }
        if(storageInfo && bearerToken) {
          var client = remoteStorage.createClient(storageInfo, category, bearerToken);
          client.put('_index', indexStr, function(err, data) {
            client.put(key+':'+timestamp, valueStr, function(err, data) {
            });
          });
        }
      }
      if(cb) {
        cb();//not really finished here yet actually
      }
    }
    function onLoad() {
      if(localStorage['_unhosted$pullInterval']) {
        delete localStorage['_unhosted$lastPullStartTime'];
        work();
        setInterval(work, localStorage['_unhosted$pullInterval']*1000);
      }
    }
    function work() {
      var now = new Date().getTime();
      maybePull(now, function() {
      });
    }
    function onReadyStateChange(cb) {
      orsc=cb;
      changeReadyState('connected', (localStorage['_unhosted$bearerToken'] != null));
    }
    function onChange(cb) {
      oc=cb;
    }
    function getUserAddress() {
      return localStorage['_unhosted$userAddress'];
    }
    function getItem(category, key) {
      ol('syncer.getItem('
        +JSON.stringify(category)+', '
        +JSON.stringify(key)+');');
      try {
        return JSON.parse(localStorage[category+'$'+key]);
      } catch(e) {
        return null;
      }
    }
    function setItem(category, key, value) {
      ol('syncer.setItem('
        +JSON.stringify(category)+', '
        +JSON.stringify(key)+', '
        +JSON.stringify(value)+');');
      var valueStr = JSON.stringify(value);
      if(key=='_index') {
        return 'item key "_index" is reserved, pick another one please';
      } else {
        var currValStr = localStorage[category+'$'+key];
        if(valueStr != currValStr) {
          var now = new Date().getTime();
          var index;
          try {
            index=JSON.parse(localStorage[category+'$_index']);
          } catch(e) {
          }
          if(!index) {
            index={};
          }
          index[key]=now;
          var indexStr=JSON.stringify(index);
          localStorage[category+'$_index']=indexStr;
          localStorage[category+'$'+key]=valueStr;
          pushItem(category, key, now, indexStr, valueStr);
          //there's some discussion about whether setItem should trigger onChange.
          //our current conclusion is that it should not:
          //oc({key: key, oldValue: getItem(category, key), newValue: value});
        }
      }
    }
    function removeItem(category, key) {
      ol('syncer.removeItem('
        +JSON.stringify(category)+', '
        +JSON.stringify(key)+');');
      if(key=='_index') {
        return 'item key "_index" is reserved, pick another one please';
      } else {
        var index;
        try {
          index=JSON.parse(localStorage[category+'$_index']);
        } catch(e) {
        }
        if(index) {
          delete index[key];
          var indexStr=JSON.stringify(index);
          localStorage[category+'$_index']=indexStr;
          delete localStorage[category+'$'+key];
          var now = new Date().getTime();
          pushItem(category, key, now, indexStr, null);
          oc({key: key, oldValue: getItem(category, key), newValue: undefined});
        }
      }
    } 
    // get an Array of all items' values.
    // if the optional callback 'cb' is given, instead that is called with
    // each item and it's key, and getCollection returns null.
    function getCollection(category, cb) {
      ol('syncer.getCollection('
        +JSON.stringify(category)+');');
      var index;
      try {
        var _index = localStorage[category+'$_index'];
        index = _index ? JSON.parse(_index) : {};
      } catch(e) {
        console.error(e);
      }
      var items = [];
      if(index) {
        for(var i in index) {
          var item;
          try {
            item = JSON.parse(localStorage[category+'$'+i]);
            cb ? cb(item, i) : items.push(item);
          } catch(e) {
            console.error(e);
          }
        }
      }
      return cb ? null : items;
    }
    function display(connectElement, categories, libDir, onChangeHandler) {
      if(libDir.length && libDir[libDir.length - 1] != '/') {//libDir without trailing slash
        libDir += '/'
      }
      document.getElementById(connectElement).innerHTML =
        '<link href="'+libDir+'remoteStorage.css" rel="stylesheet">'
        +'<input id="remotestorage-useraddress" type="text" placeholder="you@remotestorage" autofocus />'
        +'<input id="remotestorage-status" class="remotestorage-button" type="submit" value="loading &hellip;" disabled />'
        +'<img id="remotestorage-icon" class="remotestorage-loading" src="'+libDir+'remoteStorage-icon.png" />'
        +'<span id="remotestorage-disconnect">Disconnect <strong></strong></span>'
        +'<a id="remotestorage-info" href="http://unhosted.org/#remotestorage" target="_blank">?</a>'
        +'<span id="remotestorage-infotext">This app allows you to use your own data storage!<br />Click for more info on the Unhosted movement.</span>'
        +'<a id="remotestorage-get" class="remotestorage-button" href="http://unhosted.org/#remotestorage" target="_blank">get remoteStorage</a>';

      document.getElementById('remotestorage-useraddress').onkeyup = function(e) { // connect on enter
        if(e.keyCode==13) document.getElementById('remotestorage-status').click();
      }

      onReadyStateChange(function(obj) {
        if(obj.connected) { // connected state
          document.getElementById('remotestorage-connect').className = 'remotestorage-connected';
          document.getElementById('remotestorage-disconnect').getElementsByTagName('strong')[0].innerHTML = getUserAddress();
          if(obj.syncing) { // spin logo while syncing
            document.getElementById('remotestorage-icon').className = 'remotestorage-loading';
          } else { // do not spin when not syncing
            document.getElementById('remotestorage-icon').className = '';
          }
          document.getElementById('remotestorage-icon').onclick = function() { // when connected, disconnect on logo click
            localStorage.clear();
            onChangeHandler({key: null, oldValue: null, newValue: null});
            changeReadyState('connected', false);
            document.getElementById('remotestorage-connect').className = '';
            document.getElementById('remotestorage-get').style.display = 'inline';
          }
        } else { // disconnected, initial state
          document.getElementById('remotestorage-icon').className = '';
          document.getElementById('remotestorage-useraddress').disabled = true;
          document.getElementById('remotestorage-useraddress').style.display = 'none';
          document.getElementById('remotestorage-status').disabled = false;
          document.getElementById('remotestorage-status').value = 'connect';

          document.getElementById('remotestorage-status').onclick = function() {
            if(document.getElementById('remotestorage-useraddress').disabled == true) { // first click on connect reveals the input
              document.getElementById('remotestorage-get').style.display = 'none';
              document.getElementById('remotestorage-useraddress').style.display = 'inline';
              document.getElementById('remotestorage-useraddress').disabled = false;
              document.getElementById('remotestorage-useraddress').focus();
            } else { // second click on connect starts the connection
              document.getElementById('remotestorage-icon').className = 'remotestorage-loading';
              document.getElementById('remotestorage-useraddress').disabled = true;
              document.getElementById('remotestorage-status').disabled = true;
              document.getElementById('remotestorage-status').value = 'connecting';
              connect(document.getElementById('remotestorage-useraddress').value, categories, 10, libDir+'dialog.html');
            }
          };
        }
      });
      onChange(onChangeHandler);
      //init all data:
      for(var i=0; i < categories.length; i++) {
        getCollection(categories[i], function(item, key) {
          onChangeHandler({category: categories[i], key: key, newValue: item, oldValue: undefined});
        });
      }
    }
    onLoad();
    return {
      getItem       : getItem,
      getCollection : getCollection,
      setItem       : setItem,
      removeItem    : removeItem,
      display       : display,
      inspect       : inspect
    };
  })();
  //API:
  //
  // - call display(connectElement, categories, libDir, onChangeHandler({key:.., oldValue:.., newValue:..}));
  // - getCollection retrieves the array of items regardless of their id (so it makes sense to store the id inside the item)
  // - CRUD: getItem gets one item. setItem for create and update. removeItem for delete.
  //
  // a note on sync:
  // if just one client connects, then it will feel like localStorage while the user is connected. the only special case there is the moment the user connects.
  // when the page loads for the first time, there will be no data. then the user connects, and your app will receive onChange events. make sure you handle these well.
  // in fact, your app should already have a handler for 'storage' events, because they occur when another tab or window makes a change to localStorage.
  // so you'll be able to reuse that function.
  //
  // if the user tries to leave the page while there is still unsynced data, a 'leave page?' alert will be displayed. disconnecting while offline will lead to loss of data too.
  // but as long as you don't disconnect, it'll all be fine, and sync will resume when the tab is reopened and/or connectivity is re-established.
  //
  // when another device or browser makes a change, it will come in through your onChange handler. it will 'feel' like a change that came from another tab.
  // when another device makes a change while either that device or you, or both are disconnected from the remoteStorage, the change will come in later, and conflict resolution 
  // will be per item, on timestamp basis. note that these are the timestamps generated on the devices, so this only works well if all devices have their clocks in sync.
  // in all cases, you will get an event on your onChange handler for each time data is changed by another device. the event will contain both the old and the new value of the item,
  // so you can always override a change by issuing a setItem command back to the oldValue.
