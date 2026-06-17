const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://sameergaikwaddelxn_db_user:Sameer%401234@ac-adnqsfh-shard-00-00.bwd2kg8.mongodb.net:27017,ac-adnqsfh-shard-00-01.bwd2kg8.mongodb.net:27017,ac-adnqsfh-shard-00-02.bwd2kg8.mongodb.net:27017/?ssl=true&replicaSet=atlas-rhk2k7-shard-0&authSource=admin&appName=Cluster0').then(async () => {
  const hash = await bcrypt.hash('Admin@123', 12);
  await mongoose.connection.collection('users').updateOne({ email: 'superadmin@interioros.com' }, { $set: { password: hash } });
  console.log('Password reset successfully for superadmin@interioros.com');
  process.exit(0);
}).catch(console.error);
