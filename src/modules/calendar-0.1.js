remoteStorage.defineModule('calendar', function(privateBaseClient) {
  // callback expects a list of objects with the itemId and itemValue properties set
  function getEventsForDay(day) {
    var list = [];
    if(localStorage[day]) {
      var parentIdsToItemIds = localStorage[day].split(',');

      for(var i in parentIdsToItemIds) {
        var itemId = parentIdsToItemIds[i];
        var itemValue = localStorage[itemId];
        list.push({'itemId': itemId, 'itemValue': itemValue});
      }
    }
    return list;
  }
  function addEvent(itemId, day, value) {
    localStorage[itemId] = value;

    var parentIdsToItemIds = localStorage[day] ? localStorage[day].split(',') : [];
    var found = false;
    for(var i in parentIdsToItemIds) {
      if(parentIdsToItemIds[i] == itemId) {
        found = true;
        break;
      }
    }
    if(!found) {
      parentIdsToItemIds.push(itemId);
      localStorage[day] = parentIdsToItemIds;
    }
  }
  function removeEvent(itemId, day) {
    delete localStorage[itemId];

    if(!day) return;
    if(localStorage[day]) {
      var parentIdsToItemIds = localStorage[day].split(',');
      for(var i in parentIdsToItemIds) {
        if(parentIdsToItemIds[i] == itemId) {
          parentIdsToItemIds = parentIdsToItemIds.slice(0, i).concat(parentIdsToItemIds.slice(i + 1));
          if(parentIdsToItemIds.length) localStorage[day] = parentIdsToItemIds;
          else delete localStorage[day];
          break;
        }
      }
    } 
  }
  return {
    version: '0.1',
    exports: {
      getEventsForDay: getEventsForDay,
      addEvent: addEvent,
      removeEvent: removeEvent
    }
  }
});
