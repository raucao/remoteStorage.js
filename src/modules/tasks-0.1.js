remoteStorage.defineModule('tasks', '0.1', function(myBaseClient) {
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
    myBaseClient.connect(listName+'/');
    function getIds() {
      var myHashmap= myBaseClient.get(listName+'/'), myArray=[];
      for(var i in myHashmap) {
        myArray.push(i);
      }
      return myArray;
    }
    function get(id) {
      var valueStr = myBaseClient.get(listName+'/'+id);
      if(valueStr) {
        try {
          var obj = JSON.parse(valueStr);
          obj.id = id;
          return obj;
        } catch(e) {
          fire('error', e);
        }
      }
      return undefined;
    }
    function set(id, title) {
      var obj = JSON.parse(myBaseClient.get(listName+'/'+id));
      obj.title = title;
      myBaseClient.storeObject(listName+'/'+id, false, 'tasks/task', obj);
    }
    function add(title) {
      var id = getUuid();
      myBaseClient.storeObject(listName+'/'+id, false, 'tasks/task', {
        title: title,
        completed: false
      });
      return id;
    }
    function markCompleted(id, completedVal) {
      if(typeof(completedVal) == 'undefined') {
        completedVal = true;
      }
      var objStr = myBaseClient.get(listName+'/'+id);
      if(objStr) {
        try {
          var obj = JSON.parse(objStr);
          if(obj && obj.completed != completedVal) {
            obj.completed = completedVal;
            myBaseClient.storeObject(listName+'/'+id, false, 'tasks/task', obj);
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
      myBaseClient.remove(listName+'/'+id);
    }
    function on(eventType, cb) {
      myBaseClient.on(eventType, cb);
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
    dataVersion: '0.1',
    dataHints: {
      "module": "tasks are things that need doing; items on your todo list",
      
      "objectType task": "something that needs doing, like cleaning the windows or fixing a specific bug in a program",
      "string task#title": "describes what it is that needs doing",
      "boolean task#completed": "whether the task has already been completed or not (yet)",
      
      "directory tasks/todos/": "default private todo list",
      "directory tasks/:year/": "tasks that need doing during year :year",
      "directory public/tasks/:hash/": "tasks list shared to for instance a team"
    },
    codeVersion: '0.1.0',
    exports: {
      getPrivateList: getPrivateList
    }
  };
});
