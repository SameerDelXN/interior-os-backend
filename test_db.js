const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://192.168.1.4:27017');
  await client.connect();
  const db = client.db('interior-os');
  
  // Find customers that have a linkedProject field
  const customers = await db.collection('crmcustomers').find({ linkedProject: { $exists: true } }).toArray();
  console.log('Total linked projects:', customers.length);
  
  if (customers.length > 0) {
    const cust = customers[0];
    console.log('Customer ID:', cust._id);
    console.log('Linked Project:', cust.linkedProject);
    console.log('Quotations:', cust.quotations);
  }
  
  await client.close();
})();
