remoteStorage.defineModule('calendar', function(privateBaseClient) {
  // callback expects a list of objects with the itemId and itemValue properties set
  function lookupItemsForParentId(parentId, callback) {
    if(localStorage[parentId]) {
      var parentIdsToItemIds = localStorage[parentId].split(',');
      var list = [];

      for(var i in parentIdsToItemIds) {
        var itemId = parentIdsToItemIds[i];
        var itemValue = localStorage[itemId];
        list.push({'itemId': itemId, 'itemValue': itemValue});
      }

      callback(list);
    }
  }

  function storeValueForItemId(itemId, item) {
    if(item) {
      var parentId = item.parentNode.id;
      localStorage[itemId] = item.value;

      var parentIdsToItemIds = localStorage[parentId] ? localStorage[parentId].split(',') : [];
      var found = false;
      for(var i in parentIdsToItemIds) {
        if(parentIdsToItemIds[i] == itemId) {
          found = true;
          break;
        }
      }
      if(!found) {
        parentIdsToItemIds.push(itemId);
        localStorage[parentId] = parentIdsToItemIds;
      }
    }
  }

  function removeValueForItemId(itemId, item) {
    delete localStorage[itemId];

    if(!item) return;
    var parentId = item.parentNode.id;
    if(localStorage[parentId]) {
      var parentIdsToItemIds = localStorage[parentId].split(',');
      for(var i in parentIdsToItemIds) {
        if(parentIdsToItemIds[i] == itemId) {
          parentIdsToItemIds = parentIdsToItemIds.slice(0, i).concat(parentIdsToItemIds.slice(i + 1));
          if(parentIdsToItemIds.length) localStorage[parentId] = parentIdsToItemIds;
          else delete localStorage[parentId];
          break;
        }
      }
    } 
  }

  return {
    version: '0.1',
    exports: {
      lookupItemsForParentId : lookupItemsForParentId,
      storeValueForItemId    : storeValueForItemId,
      removeValueForItemId   : removeValueForItemId
    }
  }
});
