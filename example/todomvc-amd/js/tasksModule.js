function TasksModule(baseClient) {
  function getUuid() {
    var uuid = '',
        i,
        random;

    for ( i = 0; i < 32; i++ ) {
        random = Math.random() * 16 | 0;
        if ( i === 8 || i === 12 || i === 16 || i === 20 ) {
            uuid += '-';
        }
        uuid += ( i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random) ).toString( 16 );
    }
    return uuid;
  }
  function getPrivateList(listName) {
    baseClient.syncPrivate(listName+'/');
    function getIds() {
      var myHashmap= baseClient.getPrivate(listName+'/'), myArray=[];
      for(var i in myHashmap) {
        myArray.push(i);
      }
      return myArray;
    }
    function get(id) {
      var valueStr = baseClient.getPrivate(listName+'/'+id);
      if(valueStr) {
        try {
          return JSON.parse(valueStr);
        } catch(e) {
          fire('error', e);
        }
      }
      return undefined;
    }
    function set(id, obj) {
      baseClient.setPrivate(listName+'/'+id, JSON.stringify(obj));
    }
    function add(title) {
      var id = getUuid();
      baseClient.setPrivate(listName+'/'+id, JSON.stringify({
        title: title,
        completed: false
      }));
      return id;
    }
    function markCompleted(id, completedVal) {
      if(typeof(completedVal) == 'undefined') {
        completedVal = true;
      }
      var objStr = baseClient.getPrivate(listName+'/'+id);
      if(objStr) {
        try {
          var obj = JSON.parse(objStr);
          if(obj && obj.completed != completedVal) {
            obj.completed = completedVal;
            baseClient.setPrivate(listName+'/'+id, JSON.stringify(obj));
          }
        } catch(e) {
        }
      }
    }
    function isCompleted(id) {
      var obj = get(id);
      return obj && obj.completed;
    }
    function getStats() {
      var ids = getIds();
      var stat = {
        todoLeft: ids.length,
        todoCompleted: 0,
        totalTodo: 0
      };
      for (var i=0; i<stat.todoLeft; i++) {
        if (isCompleted(ids[i])) {
          stat.todoCompleted += 1;
        }
      }
      stat.todoLeft = stat.totalTodo - stat.todoCompleted;
      return stat;
    }
    function remove(id) {
      baseClient.removePrivate(listName+'/'+id);
    }
    function on(eventType, cb) {
      baseClient.on(eventType, cb);
    }
    return {
      getIds        : getIds,
      get           : get,
      set           : set,
      add           : add,
      remove        : remove,
      markCompleted : markCompleted,
      getStats      : getStats,
      on            : on
    };
  }
  return {
    getPrivateList : getPrivateList
  };
}
