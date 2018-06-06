import OGNClient from '../src/ogn';
import {readFromFile} from '../src/utils/filter';

if (process.argv.length < 3) {
  console.log('Usage: ts-node examples/show-ogn-traffic.ts CSV_PATH');
  process.exit(1);
}

let filterRows = readFromFile(process.argv[2]);

console.log('Connecting');
let client = new OGNClient(filterRows.map(row => row.ognID));

client.on('ready', () => {
  console.log('Connected');
});

client.on('record', (record: any) => {
  let filterRow = filterRows.find(row => row.ognID === record.from.call);
  let data = record.data;

  console.log(data.timestamp, filterRow!.callsign, data.longitude, data.latitude,
    Math.round(data.extension.speedMPerS * 3.6) + 'km/h', Math.round(data.altitude) + 'm');
});

client.on('close', () => {
  console.log('Connection closed');
});

client.connect();
