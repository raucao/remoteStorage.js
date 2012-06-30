# Adding remoteStorage.js v0.7 to your app:
#### add "remoteStorage.js" (you can copy it from this repo - make sure to check out branch 'v0.7' and not branch 'master'!)
#### So for requiring remoteStorage.js dynamically, in index.html, include require.js:

    <script src="require.js"></script>

#### and then require remoteStorage.js and dynamically load any modules you may want to use, using remoteStorage.loadModuleAsync instead of remoteStorage.loadModule:

    require(['./remoteStorage.js'], function(remoteStorage) {
      remoteStorage.loadModuleAsync('tasks', '0.1', 'rw', function() {
        //now the rest is the same as for the other examples
      });
    });
