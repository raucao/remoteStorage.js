remoteStorage.defineModule('money', '0.1', function(myBaseClient) {
  var balances = {
    'unhosted-project':0,
    'unhosted-reserved':0,
    'michiel':0,
    'javier':0,
    'jan':0,
    'hugo':0
  };
  function roundOff(amount) {
    return Math.floor(100*amount+0.5)/100;
  }
  function itoa(i) {
    var wholes = Math.floor(i);
    var cents = (i - Math.floor(i))*100;
    var dimes = Math.floor(cents/10);
    cents = Math.floor(cents - 10*dimes+0.5);
    //console.log(i+' -> '+wholes+'.'+dimes+cents);
    return ''+wholes+'.'+dimes+cents;
  }
  function display(name, items, owee, ower) {
    var sum=0;
    for(var thing in items) {
      console.log(' >>> '+thing+': '+itoa(items[thing])+' EUR');
      sum += items[thing];
    }
    sum = roundOff(sum);
    console.log(name+': '+itoa(sum)+' EUR');
    if(owee && ower) {
      balances[owee]+=sum;
      balances[ower]-=sum;
    }
    return sum;
  }
  function displayBalances() {
    for(var i in balances) {
      console.log(i+': '+itoa(roundOff(balances[i]))+' EUR');
    }
  }
  return {
    name: 'money',
    dataVersion: '0.1',
    dataHints: {
      "module": "Peer-to-peer bookkeeping based on IOUs (writing down who owes who how much)"
    },
    codeVersion: '0.1.0',
    exports: {
      display: display,
      displayBalances: displayBalances
    }
  };
});
