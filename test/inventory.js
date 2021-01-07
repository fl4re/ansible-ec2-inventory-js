'use strict';

const inventory = require('../lib');
const {expect} = require('chai');

const sample_data = () => JSON.parse(JSON.stringify(require('./sample_data')));
const aws_mock = data => ({
  EC2: function () {
    return {
      describeInstances: () => ({
        promise: () => Promise.resolve(data)
      })
    };
  }
});

describe('ansible/inventory/inventory.js', function () {

  it('should output ansible-compliant inventory', async function () {
    const aws = aws_mock(sample_data());
    const jsonInventory = await inventory.run(aws);
    expect(jsonInventory).to.be.deep.equal({
      '_meta': {hostvars: {}},
      tag_Name_Test_Inventory: ['52.59.188.175'],
      tag_size_XXS: ['52.59.188.175'],
      tag_Name_Test_Inventory_II: ['52.59.188.114'],
      tag_size_M: ['52.59.188.114']
    });
  });

  it('should filter instances with null PublicIpAddress property', async function () {
    const data = sample_data();
    data['Reservations'][0]['Instances'].push({
      PublicIpAddress: null,
      Tags: [
        {
          Key: 'property',
          Value: 'no_public_ip_address'
        }
      ]
    });
    const aws = aws_mock(sample_data());

    const jsonInventory = await inventory.run(aws);
    expect(jsonInventory).to.be.deep.equal({
      '_meta': {hostvars: {}},
      tag_Name_Test_Inventory: ['52.59.188.175'],
      tag_size_XXS: ['52.59.188.175'],
      tag_Name_Test_Inventory_II: ['52.59.188.114'],
      tag_size_M: ['52.59.188.114']
    });
  });

  describe('get_available_tags', function () {

    it('should reduce available tags from ec2 instances', function () {
      const ec2_instances = [
        {
          Tags: [
            {Key: 'Size', Value: 'XXS'},
            {Key: 'Name', Value: 'Test Inventory'}
          ]
        },
        {
          Tags: [
            {Key: 'Instance-Type', Value: 't2.micro'},
            {Key: 'Name', Value: 'Test Inventory'},
            {Key: 'Platform', Value: 'Linux'}
          ]
        },
        {
          Tags: [
            {Key: 'Platform', Value: 'OSX'},
            {Key: 'Name', Value: 'Test Inventory'}
          ]
        },
      ];
      const available_Tags = inventory.get_available_tags(ec2_instances);

      expect(available_Tags).to.be.deep.equal(['Size', 'Name', 'Instance-Type', 'Platform']);
    });

  });

  describe('get_inventory_by_tags', function () {

    it('Should group instances by tag', function () {
      const ec2_instances = [
        {
          PublicIpAddress: '10.0.0.1',
          Tags: [
            {Key: 'Size', Value: 'XXS'},
            {Key: 'Name', Value: 'Test Inventory'},
            {Key: 'Platform', Value: 'Linux'}
          ]
        },
        {
          PublicIpAddress: '10.0.0.2',
          Tags: [
            {Key: 'Instance-Type', Value: 't2.micro'},
            {Key: 'Name', Value: 'Test Inventory'},
            {Key: 'Platform', Value: 'Linux'}
          ]
        },
        {
          PublicIpAddress: '10.0.0.3',
          Tags: [
            {Key: 'Platform', Value: 'OSX'},
            {Key: 'Name', Value: 'Test Inventory'}
          ]
        },
        {
          PublicIpAddress: '10.0.0.4',
          Tags: [
            {Key: 'Size', Value: 'XXS'},
            {Key: 'name', Value: 'Test without capital name'},
            {Key: 'Platform', Value: 'OSX'}
          ]
        }
      ];
      const tags = ['Name', 'Platform'];

      const available_Tags = inventory.get_inventory_by_tags(tags)(ec2_instances);

      expect(available_Tags).to.be.deep.equal({
        tag_Name_Test_Inventory: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        tag_Platform_Linux: ['10.0.0.1', '10.0.0.2'],
        tag_Platform_OSX: ['10.0.0.3', '10.0.0.4']
      });

    });

    it('Should not fail when instance has no desired tag', function () {
      const ec2_instances = [
        {
          PublicIpAddress: '10.0.0.1',
          Tags: [
            {Key: 'Size', Value: 'XXS'},
            {Key: 'Name', Value: 'Test Inventory'},
            {Key: 'Platform', Value: 'Linux'}
          ]
        },
      ];
      const tags = ['name', 'Platform'];

      const available_Tags = inventory.get_inventory_by_tags(tags)(ec2_instances);

      expect(available_Tags).to.be.deep.equal({
        tag_Platform_Linux: ['10.0.0.1'],
      });

    });

  });

  describe('filter_inventory_instances', function () {

    it('Should filter instances without ip address', function () {
      const unfiltered_inventory = {
        tag_Name_Test_Inventory: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        tag_Platform_Linux: ['10.0.0.1', null],
        tag_Platform_OSX: [undefined]
      };
      const filtered_inventory = inventory.filter_inventory_instances(unfiltered_inventory);

      expect(filtered_inventory).to.be.deep.equal({
        tag_Name_Test_Inventory: ['10.0.0.1', '10.0.0.2', '10.0.0.3'],
        tag_Platform_Linux: ['10.0.0.1']
      });
    });

  });

  describe('build_full_tag', function() {

    it('should build tag with correct format', function() {
      const formatted_tag = inventory.build_full_tag('Name')('ec2_instance');
      expect(formatted_tag).to.be.equal('tag_Name_ec2_instance');
    });

    it('should convert non-alphnumeric characters to underscore', function() {
      const formatted_tag = inventory.build_full_tag('Name')('ec2$%&instance');
      expect(formatted_tag).to.be.equal('tag_Name_ec2___instance');
    });

  });

});
