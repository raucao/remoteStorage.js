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
          }
        };
      };

  return {
    create : create
  };
});
