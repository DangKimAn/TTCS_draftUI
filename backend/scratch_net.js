const net = require('net');

const client = new net.Socket();
client.setTimeout(5000);

client.connect(6543, 'aws-1-ap-southeast-2.pooler.supabase.com', function() {
    console.log('Connected to Supabase Pooler');
    client.destroy();
});

client.on('error', function(err) {
    console.error('Error connecting to Supabase Pooler:', err);
});

client.on('timeout', function() {
    console.error('Connection timed out');
    client.destroy();
});
