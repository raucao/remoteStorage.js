define(['../lib/baseClient'], function(baseClient) {
  var errorHandlers=[];
  function fire(eventType, eventObj) {
    if(eventType == 'error') {
      for(var i=0; i<errorHandlers.length; i++) {
        errorHandlers[i](eventObj);
      }
    }
  }
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
    baseClient.connect('tasks/'+listName+'/', 60);
    function getIds() {
      var myHashmap= baseClient.get('tasks/'+listName+'/'), myArray=[];
      for(var i in myHashmap) {
        myArray.push(i);
      }
      return myArray;
    }
    function get(id) {
      var valueStr = baseClient.get('tasks/'+listName+'/'+id);
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
      baseClient.storeObject('tasks/'+listName+'/'+id, 'tasks/task', obj);
    }
    function add(title) {
      var id = getUuid();
      baseClient.storeObject('tasks/'+listName+'/'+id, 'tasks/task', {
        id: id,
        title: title,
        completed: false
      });
      return id;
    }
    function markCompleted(id, completedVal) {
      if(typeof(completedVal) == 'undefined') {
        completedVal = true;
      }
      var objStr = baseClient.get('tasks/'+listName+'/'+id);
      if(objStr) {
        try {
          var obj = JSON.parse(objStr);
          if(obj && obj.completed != completedVal) {
            obj.completed = completedVal;
            baseClient.storeObject('tasks/'+listName+'/'+id, 'tasks/task', obj);
          }
        } catch(e) {
          fire('error', e);
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
        todoCompleted: 0,
        totalTodo: ids.length
      };
      for (var i=0; i<stat.totalTodo; i++) {
        if (isCompleted(ids[i])) {
          stat.todoCompleted += 1;
        }
      }
      stat.todoLeft = stat.totalTodo - stat.todoCompleted;
      return stat;
    }
    function remove(id) {
      baseClient.remove('tasks/'+listName+'/'+id);
    }
    function on(eventType, cb) {
      baseClient.on(eventType, cb);
      if(eventType == 'error') {
        errorHandlers.push(cb);
      }
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
    name: 'tasks',
    version: '0.1',
    hints: {
      "": "tasks are things that need doing; items on your todo list",
      "task": "something that needs doing, like cleaning the windows or fixing a specific bug in a program",
      "task#title": "describes what it is that needs doing",
      "task#completed": "whether the task has already been completed or not (yet)"
    },
    objectTypes: {
      task : {
        id: 'string',
        title: 'string',
        completed: 'boolean'
      }
    },
    exports: {
      getPrivateList: getPrivateList
    }
  };
});
