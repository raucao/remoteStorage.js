var ENTER_KEY = 13;

window.addEventListener( "load", windowLoadHandler, false );

function Todo( title, completed ) {
    this.id = getUuid();
    this.title = title;
    this.completed = completed;
}

function windowLoadHandler() {
    require(['../../src/remoteStorage'], function(remoteStorage) {
      var todos;
      remoteStorage.displayWidget('remotestorage-connect');
      remoteStorage.defineModule('tasks', '0.1', function(baseClient) {
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
        return {
          getPrivateList: function(listName) {
            remoteStorage.tasks.sync(listName+'/');
            return {
              getIds: function() {
                return baseClient.get(listName+'/');
              },
              get: function(id) {
                baseClient.get(listName+'/'+id);
              },
              set: function(id, obj, silent) {
                baseClient.set(listName+'/'+id, JSON.stringify(obj), silent);
              },
              add: function(text, silent) {
                var id = getUuid();
                baseClient.set(listName+'/'+id, JSON.stringify({
                  text: text,
                  completed: false
                }), silent);
                return id;
              },
              markCompleted: function(id, completedVal, silent) {
                if(typeof(completedVal) == 'undefined') {
                  completedVal = true;
                }
                var objStr = baseClient.get(listName+'/'+id);
                if(objStr) {
                  try {
                    var obj = JSON.parse(objStr);
                    if(obj && obj.completed != completedVal) {
                      obj.completed = completedVal;
                      baseClient.set(listName+'/'+id, JSON.stringify(obj), silent);
                    }
                  } catch(e) {
                  }
                }
              },
              getStats: function() {
                return {
                  todoLeft: 0,
                  todoCompleted: 0,
                  totalTodo: 0
                };
              },
              remove: function(id) {
                baseClient.remove(listName+'/'+id);
              }
            };
          },
          getLimitedList: function(name, secret) {
          },
          getPublicList: function(name, userAddress) {
          },
          sync: baseClient.sync,
          on: baseClient.on
        };
      });
      remoteStorage.loadModule('tasks', '0.1', 'rw');
      remoteStorage.tasks.on('error', function(err) {
      });
      remoteStorage.tasks.on('added', function(id, obj) {
        refreshData();
      });
      remoteStorage.tasks.on('changed', function(id, oldObj, newObj) {
        refreshData();
      });
      remoteStorage.tasks.on('removed', function(id) {
        refreshData();
      });
      todos = remoteStorage.tasks.getPrivateList('todos');
      document.getElementById( 'new-todo' ).addEventListener( "keypress", newTodoKeyPressHandler, false );
      document.getElementById( 'toggle-all' ).addEventListener( "change", toggleAllChangeHandler, false );

      function inputEditTodoKeyPressHandler( event ) {
          var inputEditTodo,
              trimmedText,
              todoId;

          inputEditTodo = event.target;
          trimmedText = inputEditTodo.value.trim();
          todoId = event.target.id.slice( 6 );

          if ( trimmedText ) {
              if ( event.keyCode === ENTER_KEY ) {
                  todos.set( todoId, trimmedText );
              }
          } else {
              todos.remove( todoId );
          }
      }

      function inputEditTodoBlurHandler( event ) {
          var inputEditTodo,
              todoId;

          inputEditTodo = event.target;
          todoId = event.target.id.slice( 6 );
          editTodo( todoId, inputEditTodo.value );
      }

      function newTodoKeyPressHandler( event ) {
        if ( event.keyCode === ENTER_KEY ) {

          var trimmedText = document.getElementById( 'new-todo' ).value;
          if ( trimmedText ) {
            todos.add( trimmedText );
          }
        }
      }

      function toggleAllChangeHandler( event ) {
          for ( var i in todos.getIds() ) {
              todos.markAsCompleted( i, event.target.checked);
          }
      }

      function spanDeleteClickHandler( event ) {
          removeTodoById( event.target.getAttribute( 'data-todo-id' ) );
      }

      function hrefClearClickHandler() {
          var ids = todos.getIds();
          for(var i in ids) {
              if ( todos.get(i).completed ) {
                  todos.removeItem(i);
              }
         }
      }

      function todoContentHandler( event ) {
          var todoId,
              div,
              inputEditTodo;

          todoId = event.target.getAttribute( 'data-todo-id' );
          div = document.getElementById( 'li_'+todoId );
          div.className = 'editing';

          inputEditTodo = document.getElementById( 'input_' + todoId );
          inputEditTodo.focus();
      }

      function checkboxChangeHandler( event ) {
          var checkbox;
          checkbox = event.target;
          todos.markCompleted( checkbox.getAttribute( 'data-todo-id' ), checkbox.checked);
      }

      function refreshData() {
          computeStats();
          redrawTodosUI();
          redrawStatsUI();
          changeToggleAllCheckboxState();
      }

      function computeStats() {
          var i;

          stat = new Stat();
          stat.totalTodo = todos.length;
          for ( i=0; i < todos.length; i++ ) {
              if ( todos[i].completed ) {
                  stat.todoCompleted += 1;
              }
          }
          stat.todoLeft = stat.totalTodo - stat.todoCompleted;
      }


      function redrawTodosUI() {

          var ul,
              todo,
              checkbox,
              label,
              deleteLink,
              divDisplay,
              inputEditTodo,
              li,
              i;

          ul = document.getElementById( 'todo-list' );

          document.getElementById( 'main' ).style.display = todos.length ? 'block' : 'none';

          ul.innerHTML = "";
          document.getElementById( 'new-todo' ).value = '';

          for ( i= 0; i < todos.length; i++ ) {
              todo = todos[i];

              // create checkbox
              checkbox = document.createElement( 'input' );
              checkbox.className = 'toggle';
              checkbox.setAttribute( 'data-todo-id', todo.id );
              checkbox.type = 'checkbox';
              checkbox.addEventListener( 'change', checkboxChangeHandler );

              // create div text
              label = document.createElement( 'label' );
              label.setAttribute( 'data-todo-id', todo.id );
              label.appendChild( document.createTextNode( todo.title ) );


              // create delete button
              deleteLink = document.createElement( 'button' );
              deleteLink.className = 'destroy';
              deleteLink.setAttribute( 'data-todo-id', todo.id );
              deleteLink.addEventListener( 'click', spanDeleteClickHandler );

              // create divDisplay
              divDisplay = document.createElement( 'div' );
              divDisplay.className = 'view';
              divDisplay.setAttribute( 'data-todo-id', todo.id );
              divDisplay.appendChild( checkbox );
              divDisplay.appendChild( label );
              divDisplay.appendChild( deleteLink );
              divDisplay.addEventListener( 'dblclick', todoContentHandler );


              // create todo input
              inputEditTodo = document.createElement( 'input' );
              inputEditTodo.id = 'input_' + todo.id;
              inputEditTodo.className = 'edit';
              inputEditTodo.value = todo.title;
              inputEditTodo.addEventListener( 'keypress', inputEditTodoKeyPressHandler );
              inputEditTodo.addEventListener( 'blur', inputEditTodoBlurHandler );


              // create li
              li = document.createElement( 'li' );
              li.id = 'li_' + todo.id;
              li.appendChild( divDisplay );
              li.appendChild( inputEditTodo );


              if ( todo.completed )
              {
                  li.className += 'complete';
                  checkbox.checked = true;
              }

              ul.appendChild( li );
          }


      }

      function changeToggleAllCheckboxState() {
          var toggleAll = document.getElementById( 'toggle-all' );
          if ( stat.todoCompleted === todos.length ) {
              toggleAll.checked = true;
          } else {
              toggleAll.checked = false;
          }
      }

      function redrawStatsUI() {
          removeChildren( document.getElementsByTagName( 'footer' )[ 0 ] );
          document.getElementById( 'footer' ).style.display = todos.length ? 'block' : 'none';

          if ( stat.todoCompleted > 0 ) {
              drawTodoClear();
          }

          if ( stat.totalTodo > 0 ) {
              drawTodoCount();
          }
      }

      function drawTodoCount() {

          var number,
              theText,
              remaining;
          // create remaining count
          number = document.createElement( 'strong' );
          number.innerHTML = stat.todoLeft;
          theText = ' item';
          if ( stat.todoLeft !== 1 ) {
              theText += 's';
          }
          theText += ' left';

          remaining = document.createElement( 'span' );
          remaining.id = 'todo-count';
          remaining.appendChild( number );
          remaining.appendChild( document.createTextNode( theText ) );

          document.getElementsByTagName( 'footer' )[ 0 ].appendChild( remaining );
      }

      function drawTodoClear() {

          var buttonClear = document.createElement( 'button' );
          buttonClear.id = 'clear-completed';
          buttonClear.addEventListener( 'click', hrefClearClickHandler );
          buttonClear.innerHTML = 'Clear completed (' + stat.todoCompleted + ')';


          document.getElementsByTagName( 'footer' )[ 0 ].appendChild( buttonClear );
      }


      function removeChildren( node ) {
          node.innerHTML = '';
      }


    });
}
