'use strict';

const BASE_INVENTORY = {'_meta': {hostvars: {}}};

const instance_tag = tag => instance => {
  const found_tag = instance['Tags'].find(it => {
    return it['Key'] === tag;
  });

  if (!found_tag) {
    return;
  }

  return found_tag['Value'];
};

const build_full_tag = tag_name => tag => {
  if (!tag) {
    return;
  }

  return `tag_${tag_name}_${tag}`.replace(/[^0-9A-Za-z]/g, '_');
};

const reduce_by_tag = tag_name => (instances_obj, instance) => {
  const get_tag = instance_tag(tag_name);
  const build_tag = build_full_tag(tag_name);

  const tag = build_tag(get_tag(instance));
  if (tag) {
    if (!instances_obj[tag]) {
      instances_obj[tag] = [];
    }
    instances_obj[tag].push(instance['PublicIpAddress']);
  }

  return instances_obj;
};

const flatten_reservations_to_instances = (instances, instance) => ([...instances, ...instance['Instances']]);


const filter_instances = instances => {
  return instances.filter(it => it);
};

const filter_inventory_instances = inventory => {
  return Object
    .entries(inventory)
    .reduce((inventory, [key, instances]) => {
      const filtered_instances = filter_instances(instances);
      if (filtered_instances.length) {
        inventory[key] = filtered_instances;
      } else {
        delete inventory[key];
      }
      return inventory;
    }, {});
};

const reduce_instance_tags = (tags, {Tags}) => {
  return Tags.reduce((tags, {Key}) => tags.add(Key), tags);
};

const get_available_tags = function (ec2_instances) {
  return Array.from(ec2_instances.reduce(reduce_instance_tags, new Set()));
};

const get_inventory_by_tags = available_tags => ec2_instances => {
  return available_tags.reduce((inventory, tag) => {
    const new_tagged_instances = ec2_instances.reduce(reduce_by_tag(tag), {});
    return {...inventory, ...new_tagged_instances};
  }, {});
};

const get_EC2_instances = async function (aws) {
  const ec2 = new aws.EC2;
  const data = await ec2.describeInstances().promise();
  const reservations = data['Reservations'];
  return reservations.reduce(flatten_reservations_to_instances, []);
};

const run = async function (aws) {
  const ec2_instances = await get_EC2_instances(aws);
  const available_tags = get_available_tags(ec2_instances);
  const inventory_by_tags = get_inventory_by_tags(available_tags)(ec2_instances);
  const filtered_inventory = filter_inventory_instances(inventory_by_tags);

  return Object.assign(BASE_INVENTORY, filtered_inventory);
};

module.exports = {
  run,
  get_available_tags,
  get_inventory_by_tags,
  filter_inventory_instances,
  build_full_tag
};

