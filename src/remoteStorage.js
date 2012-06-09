define(
  ['require', './lib/platform', './lib/couch', './lib/dav', './lib/simple', './lib/webfinger', './lib/hardcoded', './lib/widget', './lib/syncClient'],
  function (require, platform, couch, dav, simple, webfinger, hardcoded, widget, syncClient) {
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
      };

  return {
    getStorageInfo     : getStorageInfo,
    createStorageInfo  : createStorageInfo,
    createClient       : syncClient.create,
    createOAuthAddress : widget.createOAuthAddress,
    receiveToken       : widget.receiveToken,
    displayWidget      : widget.display
  };
});
