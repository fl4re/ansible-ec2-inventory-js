# ansible-ec2-inventory-js  
  
Creates an ansible-compliant dynamic inventory from *AWS-EC2* instances.  
  
### v0.0.1 version specs:  
- *eu-central-1* region is used.  
- Inventory is based on EC2 instances tags.  
  
## Script usage within your project.  
In the following examples, we assume you have an **ansible/inventory** directory   
  
### Option 1: Installing globally and using shell script:  
  
- #### Install module globally  
```bash  
npm install -g ansible-ec2-inventory-js  
```  
  
- #### Create script `ansible/inventory/inventory.sh`  
```bash  
#!/bin/bash  
  
ansible-ec2-inventory  
```  
  
### Option 2: Using shell script that uses npx  
```bash  
#!/bin/bash  
  
npx ansible-ec2-inventory  
```  
### Executing your playbooks
Once you have created your inventory script, it will be executed along with your other inventory sources
```bash  
ansible-playbook -i ansible/inventory ansible/your_playbook.yml  
```
