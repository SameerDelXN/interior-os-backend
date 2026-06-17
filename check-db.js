const mongoose = require('mongoose');

mongoose.connect('mongodb://sameergaikwaddelxn_db_user:Sameer%401234@ac-adnqsfh-shard-00-00.bwd2kg8.mongodb.net:27017,ac-adnqsfh-shard-00-01.bwd2kg8.mongodb.net:27017,ac-adnqsfh-shard-00-02.bwd2kg8.mongodb.net:27017/?ssl=true&replicaSet=atlas-rhk2k7-shard-0&authSource=admin&appName=Cluster0').then(async () => {
  const msgs = await mongoose.connection.collection('messages').find({ reactions: { $exists: true, $not: {$size: 0} } }).toArray();
  console.log('Messages with reactions:', msgs.length);
  if(msgs.length > 0) {
    console.log(JSON.stringify(msgs[0].reactions, null, 2));
  }
  process.exit(0);
}).catch(console.error);
