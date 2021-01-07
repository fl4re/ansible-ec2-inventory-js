#!/usr/bin/env node
'use strict';

const aws = require('aws-sdk');
const inventory = require('./lib');

aws.config.update({region: 'eu-central-1'});
const json_output = data => console.info(JSON.stringify(data, null, 2));

inventory.run(aws).then(json_output);
