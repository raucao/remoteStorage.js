define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/simple', './lib/webfinger', './lib/hardcoded'],
  function (require, platform, couch, dav, simple, webfinger, hardcoded) {
    var createStorageInfo = function(href, type, properties) {
        var nodirs = (type.substring(0, 'https://www.w3.org/community/rww/wiki/read-write-web-00'.length) != 'https://www.w3.org/community/rww/wiki/read-write-web-00');
        return {
          href: href,
          type: type,
          nodirs: nodirs,
          properties: properties
        }
      },
      getStorageInfo = function (userAddress, cb) {
        if(typeof(userAddress) != 'string') {
          cb('user address should be a string');
        } else {
          webfinger.getStorageInfo(userAddress, {timeout: 3000}, function(err, data) {
            if(err==404 || err=='timeout') {
              hardcoded.guessStorageInfo(userAddress, {timeout: 3000}, function(err2, data2) {
                var storageInfo;
                try {
                  createStorageInfo(data2.href, data2.type, data2.properties);
                } catch(e) {
                }
                cb(err2, storageInfo);
              });
            } else {
              cb(err, createStorageInfo(data.href, data.type, data.properties));
            }
          });
        }
      },
      createOAuthAddress = function (storageInfo, scopes, redirectUri) {
        if(storageInfo.type=='https://www.w3.org/community/rww/wiki/read-write-web-00#simple') {
          scopesStr = scopes.join(' ');
        } else {
          var legacyScopes = [];
          for(var i=0; i<scopes.length; i++) {
            legacyScopes.push(scopes[i].split(':')[0].split('/')[0]);
          }
          scopesStr = legacyScopes.join(',');          
        }
        var hostAndRest;
        if(redirectUri.substring(0, 'https://'.length) == 'https://') {
          hostAndRest = redirectUri.substring('https://'.length);
        } else if(redirectUri.substring(0, 'http://'.length) == 'http://') {
          hostAndRest = redirectUri.substring('http://'.length);
        } else {
          throw new Error('redirectUri does not start with https:// or http://');
        }
        var host = hostAndRest.split(':')[0].split('/')[0];
        var terms = [
          'redirect_uri='+encodeURIComponent(redirectUri),
          'scope='+encodeURIComponent(scopesStr),
          'response_type=token',
          'client_id='+encodeURIComponent(host)
        ];
        var authHref = storageInfo.properties['auth-endpoint'];
        return authHref + (authHref.indexOf('?') === -1?'?':'&') + terms.join('&');
      },
      getDriver = function (type, cb) {
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
      createClient = function (storageInfo, basePath, token) {
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
          }
        };
      },
      receiveToken = function () {
        var params = platform.getFragmentParams();
        for(var i = 0; i < params.length; i++) {
          if(params[i].substring(0, 'access_token='.length)=='access_token=') {
            return params[i].substring('access_token='.length);
          }
        }
        return null;
      },
      displayWidget = function(connectElement, scopesToRequest) {
        document.getElementById(connectElement).innerHTML =
          '<style>'
          +'#remotestorage-connect { position:fixed; top:15px; right:15px; height:32px; width:275px; font:normal 16px/100% sans-serif; z-index:99999; background:rgba(0,0,0,.3); padding:5px; border-radius:7px; box-shadow:0 1px rgba(255,255,255,.05), inset 0 1px rgba(0,0,0,.05); transition:width 500ms, background 500ms; }'
          +'#remotestorage-connect.remotestorage-connected { width:32px; background:none; box-shadow:none; }'

          +'.remotestorage-button { margin:0; padding:.3em; font-size:14px; height:26px !important; background:#ddd; color:#333; border:1px solid #ccc; border-radius:3px; box-shadow:0 1px 1px #fff inset; }'

          +'#remotestorage-get { position:absolute; left:25px; top:8px; max-height:16px; text-decoration:none; font-weight:normal; }'
          +'#remotestorage-useraddress { position:absolute; display:none; left:25px; top:8px; margin:0; padding:0 17px 0 3px; height:25px; width:142px; background:#eee; color:#333; border:0; border-radius:3px 0 0 3px; box-shadow:0 1px #fff, inset 0 1px #999; font-weight:normal; font-size:14px; }'
          +'#remotestorage-useraddress:hover, #remotestorage-useraddress:focus { background:#fff; color:#000; }'
          +'#remotestorage-icon { position:absolute; right:84px; -webkit-transition:right 500ms; -moz-transition:right 500ms; transition:right 500ms; z-index:99997; }'
          +'#remotestorage-status { position:absolute; right:8px; top:8px; padding:0 0 0 17px; width:90px; cursor:pointer; text-align:left; border-radius:0 3px 3px 0; font-weight:normal; }'
          +'#remotestorage-status:hover, #remotestorage-status:focus, .remotestorage-button:hover, .remotestorage-button:focus { background:#eee; color:#000; text-decoration:none; }'

          +'#remotestorage-info { position:absolute; left:0; padding:9px 8px; color:#fff; text-decoration:none; z-index:99999; font-weight:normal; }'
          +'#remotestorage-infotext { display:none; position:absolute; left:0; top:0; width:255px; height:32px; padding:6px 5px 4px 25px; font-size:10px; background:black; color:white; border-radius:7px; opacity:.85; text-decoration:none; white-space:nowrap; z-index:99998; }'
          +'#remotestorage-info:hover { color:#fff; }'
          +'#remotestorage-info:hover+#remotestorage-infotext { display:inline; }'

          +'#remotestorage-icon.remotestorage-loading {'
          +'    -webkit-animation-name:remotestorage-loading; -webkit-animation-duration:2s; -webkit-animation-iteration-count:infinite; -webkit-animation-timing-function:linear;'
          +'    -moz-animation-name:remotestorage-loading; -moz-animation-duration:2s; -moz-animation-iteration-count:infinite; -moz-animation-timing-function:linear;'
          +'    -o-animation-name:remotestorage-loading; -o-animation-duration:2s; -o-animation-iteration-count:infinite; -o-animation-timing-function:linear;'
          +'    -ms-animation-name:remotestorage-loading; -ms-animation-duration:2s; -ms-animation-iteration-count:infinite; -ms-animation-timing-function:linear; }'
          +'@-webkit-keyframes remotestorage-loading { from{-webkit-transform:rotate(0deg)} to{-webkit-transform:rotate(360deg)} }'
          +'@-moz-keyframes remotestorage-loading { from{-moz-transform:rotate(0deg)} to{-moz-transform:rotate(360deg)} }'
          +'@-o-keyframes remotestorage-loading { from{-o-transform:rotate(0deg)} to{-o-transform:rotate(360deg)} }'
          +'@-ms-keyframes remotestorage-loading { from{-ms-transform:rotate(0deg)} to{ -ms-transform:rotate(360deg)} }'

          +'#remotestorage-connect.remotestorage-connected #remotestorage-useraddress, #remotestorage-connect.remotestorage-connected #remotestorage-status, #remotestorage-connect.remotestorage-connected #remotestorage-info, #remotestorage-connect.remotestorage-connected #remotestorage-get { display:none !important; }'
          +'#remotestorage-connect.remotestorage-connected #remotestorage-icon { right:0; opacity:.5; cursor:pointer; }'
          +'#remotestorage-disconnect { display:none; position:absolute; right:6px; top:9px; padding:5px 28px 2px 6px; height:17px; white-space:nowrap; font-size:10px; background:#000; color:#fff; border-radius:5px; opacity:.5; text-decoration:none; z-index:99996; }'
          +'#remotestorage-disconnect strong { font-weight:bold; }'
          +'#remotestorage-connect.remotestorage-connected #remotestorage-icon:hover { opacity:1; }'
          +'#remotestorage-connect.remotestorage-connected #remotestorage-icon:hover+#remotestorage-disconnect { display:inline; }'
          +'</style>'
          +'<input id="remotestorage-useraddress" type="text" placeholder="you@remotestorage" autofocus />'
          +'<input id="remotestorage-status" class="remotestorage-button" type="submit" value="loading &hellip;" disabled />'
          +'<img id="remotestorage-icon" class="remotestorage-loading" src="remoteStorage-icon.png" />'
          +'<span id="remotestorage-disconnect">Disconnect <strong></strong></span>'
          +'<a id="remotestorage-info" href="http://unhosted.org/#remotestorage" target="_blank">?</a>'
          +'<span id="remotestorage-infotext">This app allows you to use your own data storage!<br />Click for more info on the Unhosted movement.</span>'
          +'<a id="remotestorage-get" class="remotestorage-button" href="http://unhosted.org/#remotestorage" target="_blank">get remoteStorage</a>';

        document.getElementById('remotestorage-useraddress').onkeyup = function(e) { // connect on enter
          if(e.keyCode==13) document.getElementById('remotestorage-status').click();
        }
      }

  return {
    getStorageInfo     : getStorageInfo,
    createStorageInfo  : createStorageInfo,
    createOAuthAddress : createOAuthAddress,
    createClient       : createClient,
    receiveToken       : receiveToken,
    displayWidget      : displayWidget
  };
});
