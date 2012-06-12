define(
  ['require', './platform', './wireClient'],
  function (require, wireClient) {
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

    function startSync(categories, pullInterval, dialogPath) {
      ol('startSync('
        +JSON.stringify(categories)+', '
        +JSON.stringify(pullInterval)+', '
        +JSON.stringify(dialogPath)+');');
      if(typeof(pullInterval) === 'undefined') {
        pullInterval = 60;
      }
      localStorage['_unhosted$categories'] = JSON.stringify(categories);
      localStorage['_unhosted$pullInterval'] = pullInterval;
          if(pullInterval) {
            setInterval(work, pullInterval*1000);//will first trigger a pull if it's time for that
          }
          changeReadyState('connected', true);
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
    onLoad();
              //baseModule: delete[silent=false], set[silent=false], sync, get, on:error,populated,changed
    //onload, should trigger populated
    //delete,set should trigger push if online.
    //connection established should trigger pull and push in all clients, and if something changed, trigger populated
    //timer should trigger pull, and if something changes, trigger changed.
    //
    return {
      getItem       : getItem,
      getCollection : getCollection,
      setItem       : setItem,
      removeItem    : removeItem,
      display       : display,
      inspect       : inspect
    };
  })();
