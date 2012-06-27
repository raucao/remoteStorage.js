# Adding the remoteStorage syncer to your app:
#### add the "syncer/" directory (you can copy it from this repo)
#### in index.html, include this script and the stylesheet:

    <script src="syncer/include.js"></script>
    <link rel="stylesheet" href="syncer/remoteStorage.css">

#### in the place where you want the remoteStorage element to go, add a div:

    <div id="remotestorage-connect"></div>

#### then in your app's onload function, add a call to put the syncer UI into that div, and specify your onChange handler:

    syncer.display('remotestorage-connect', ['tasks'], 'syncer/', function(e) {
      refreshData();
    });

#### to see what's going on under the hood, optionally add the bookmarklet for the Inspector Gadget to your page:

    <div id="inspector-bookmarklet" style="position:absolute; bottom:1em; left:1em;">Drag to bookmark bar: <a  href="javascript:if(typeof(syncer)=='undefined'){alert('Oops! Not supported here. Please point the developer of this app to http://unhosted.org');}else{syncer.inspect();}">Inspector Gadget</a></div>

# using the syncer object:

#### to load the array of task items, call:

    syncer.getCollection('tasks');

#### to get an item by id, you could search for it in the array, or just call:

    syncer.getItem('tasks', id);

#### to add or update an item with a certain id, call:

    syncer.setItem('tasks', id, object); //so without stringifying

#### to remove an item from the collection, call:

    syncer.removeItem('tasks', id);

#### check out [js/todo.js](https://github.com/unhosted/todomvc/blob/master/js/app.js) to see the code of this app.
