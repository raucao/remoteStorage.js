remoteStorage.defineModule('money', '0.1', function(myBaseClient) {
  function genUuid() {
    var uuid = '',
      i,
      random;
    for(i=0; i<32; i++) {
        random = Math.random() * 16 | 0;
        if(i === 8 || i === 12 || i === 16 || i === 20 ) {
            uuid += '-';
        }
        uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
  }
  
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
  function addIOU(tag, thing, amount, currency, owee, ower) {
    var uuid = genUuid();
    myBaseClient.storeObject('IOUs/'+ower+'/'+owee+'/'+currency+'/'+uuid, true, 'IOU', {
      tag: tag,
      thing: thing,
      amount: -amount
    });
    myBaseClient.storeObject('IOUs/'+owee+'/'+ower+'/'+currency+'/'+uuid, true, 'IOU', {
      tag: tag,
      thing: thing,
      amount: amount
    });
  }
  function addDeclaration(owee, ower, comment, date, amount, currency) {
  //addIOU( tag,   thing, amount, currency, owee, ower) {
    addIOU(date, comment, amount, currency, owee, ower);
  }
  function reportTransfer(from, to, date, amount, currency) {
  //addIOU( tag,      thing, amount, currency,owee,ower) {
    addIOU(date, 'transfer', amount, currency, to, from);
  }
  function getBalance(personName, currency) {
    var peers = myBaseClient.get('IOUs/'+personName+'/', true),
      balance = 0;
    for(var i in peers) {
      var thisPeerBalance = 0;
      var thisPeerIOUs = myBaseClient.get('IOUs/'+personName+'/'+i+currency+'/', true);
      for(var j in thisPeerIOUs) {
        var thisIOU = JSON.parse(myBaseClient.get('IOUs/'+personName+'/'+i+currency+'/'+j, true));
        //console.log(personName+'-'+i+':'+j+' '+typeof(thisPeerBalance));
        thisPeerBalance += thisIOU.amount;
      }
      balance += thisPeerBalance;
    }
    return balance;
  }
  function getBalances2() {
    var peers = myBaseClient.get('IOUs/', true);
    var balances = {};
    for(var i in peers) {
      var peerName = i.substring(0, i.length-1);
      balances[peerName] = itoa(roundOff(getBalance(peerName, 'EUR')))+' EUR';
    }
    return balances;
  }
  function getBalances(date, currency) {
    var balances={};
    var peers=myBaseClient.get(date+'/0/');
    for(var i in peers) {
      var peerName = i.substring(0, i.length-1);
      balances[peerName]=JSON.parse(myBaseClient.get(date+'/0/'+i+'balance'))[currency];
    }
    return balances;
  }
  function setBalance(date, peer, amount, currency) {
    var obj={};
    obj[currency]=amount;
    myBaseClient.storeObject(date+'/0/'+peer+'/balance', false, 'balance', obj);
  }
  return {
    name: 'money',
    dataVersion: '0.1',
    dataHints: {
      "module": "Peer-to-peer bookkeeping based on IOUs (writing down who owes who how much)"
    },
    codeVersion: '0.1.0',
    exports: {
      reportTransfer: reportTransfer,
      addDeclaration: addDeclaration,
      getBalances: getBalances,
      getBalances2: getBalances2,
      setBalance: setBalance
    }
  };
});
