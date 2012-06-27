# Adding remoteStorage.js v0.7 to your app:
#### add "js/remoteStorage.js" (you can copy it from this repo - make sure to check out branch 'v0.7' and not branch 'master'!)
#### in index.html, include this script and the stylesheet:

    <script src="js/remoteStorage.js"></script>

#### in the place where you want the remoteStorage element to go, add a div:

    <div id="remotestorage-connect"></div>

#### then in your app's onload function, add a call to put the 'connect your remote storage' UI into that div, load the 'tasks' module,

    remoteStorage.displayWidget('remotestorage-connect');
    remoteStorage.loadModule('tasks', '0.1', 'rw');

#### open a private task list:

    todos = remoteStorage.tasks.getPrivateList('todos');

#### and specify your handlers for 'error' and 'change' on the task list:

    todos.on('error', function(err) {
    });
    todos.on('change', function(id, obj) {
      refreshData();
    });

#### note that your change handler will be called with an object that has an 'origin' field, that comes with a value of 'tab', 'device', or 'cloud'

Note: maybe 'window' is a better term than 'tab' here, this sort of details is still subject to change in the final v0.7


# using the tasks list:

#### function list.getIds();

returns an array of id's, which you can use to retrieve the actual objects.

#### function list.get(id);

returns an object from the list, or undefined if there is no object in the list with that id

#### function list.set(id, obj);

sets the item with that id to that object (might trigger a 'change' event with origin 'tab').

#### function list.add(text);

creates a new todo item with that text, completed set to false, and a randomly generated id, which is returned by the function.

#### function list.remove(id);

removes that item

#### function list.markAsCompleted(id);

marks that todo item as completed (you can see we really have a higher-level API here that understands that tasks are things that have a boolean 'completed' field)

#### function list.isCompleted(id);

returns true or false. this one is maybe a bit silly, you could also just get the object and read the obj.completed field. or maybe we should make obj.isCompleted(), 
inline with OO practice.
