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
      baseClient.getPrivate(listName+'/'+id);
    }
    function set(id, obj, silent) {
      baseClient.setPrivate(listName+'/'+id, JSON.stringify(obj), silent);
    }
    function add(text, silent) {
      var id = getUuid();
      baseClient.setPrivate(listName+'/'+id, JSON.stringify({
        text: text,
        completed: false
      }), silent);
      return id;
    }
    function markCompleted(id, completedVal, silent) {
      if(typeof(completedVal) == 'undefined') {
        completedVal = true;
      }
      var objStr = baseClient.getPrivate(listName+'/'+id);
      if(objStr) {
        try {
          var obj = JSON.parse(objStr);
          if(obj && obj.completed != completedVal) {
            obj.completed = completedVal;
            baseClient.setPrivate(listName+'/'+id, JSON.stringify(obj), silent);
          }
        } catch(e) {
        }
      }
    }
    function getStats() {
      var stat = {
        todoLeft: getIds().length,
        todoCompleted: 0,
        totalTodo: 0
      };

      for (var i=0; i<stat.todoLeft; i++) {
        if (todos[i].completed) {
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
