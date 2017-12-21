'use strict';
var https = require('https');
var fs = require('fs');

const args = process.argv;
const arg = args[2];
const separator = args[3] || ',';

let mode = 'default';
let json = '';

if (arg === 'save') {
    mode = 'save';
} else if (arg === 'parse') {
    mode = 'parse';
}

const options = {
    host: 'bitnodes.earn.com',
    path: '/api/v1/snapshots/latest/',
    headers: { 'User-Agent': 'bitnodes-export' }
};

// Write headers.
const headers = [
    'IP address',
    'Protocol version',
    'User agent',
    'Connected since',
    'Services',
    'Height',
    'Hostname',
    'City',
    'Country code',
    'Latitude',
    'Longitude',
    'Timezone',
    'ASN',
    'Organization name'
];

console.log('Running Bitnodes export in mode "' + mode + '" with separator "' + separator + '"');

const appendField = function (field) {
    if (!field) {
        return '';
    }

    if (typeof field !== 'string') {
        return field;
    }

    let parsed = field;

    parsed = parsed.split('"').join(''); // Should be faster than Regex.
    //parsed = parsed.replace(/"/g, '');

    return '"' + parsed + '"';
}

const parseJson = function (data, filename) {
    const path = filename + '.csv';

    // Remove existing file, if it exists.
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }

    fs.appendFileSync(path, headers.join(separator) + '\r\n');

    for (var attributename in data.nodes) {
        var lines = [];

        var ipAddress = attributename;
        lines.push(appendField(ipAddress));

        var node = data.nodes[ipAddress];

        for (var i = 0; i < node.length; i += 1) {
            lines.push(appendField(node[i]));
        }

        fs.appendFileSync(path, lines.join(separator) + '\r\n');
    }

    console.log(path + ' written to disk.');
};

https.get(options, function (res) {
    res.on('data', function (chunk) {
        json += chunk;
    });

    res.on('end', function () {
        if (res.statusCode === 200) {
            try {
                var data = JSON.parse(json);

                const date = new Date(data.timestamp * 1000);
                const today = date.toISOString().split('T')[0]; // Take date, convert to ISO string, grab only the date.
                const filename = 'bitnodes-' + today;

                if (mode !== 'parse') {
                    fs.writeFile(filename + '.json', json, (err) => {
                        if (err) throw err;
                        console.log(filename + '.json written to disk.');

                        if (mode !== 'save') {
                            parseJson(data, filename);
                        }
                    });
                } else {
                    parseJson(data, filename);
                }
            } catch (e) {
                console.log('Error parsing or saving data:', + e.message);
            }
        } else {
            console.log('Error, status code:', res.statusCode);
        }
    });

}).on('error', function (err) {
    console.log('Unhandled error:', err);
});
