# Introduction

## InfluxDB Schema Auditor

Influxdb needs periodic auditing of schema to identify tag cardinality.
High cardinality measurements can cause extreme slowness in database and
sometime database may go down and recovery takes longer.

Auditor runs an audit on schema and prints all the measurements with their
tag cardinality sorted in descending order.

Utility can export the schema to a specified location.

### Configuration

#### Use Tunnel to connect to Influxdb:
 Configuration can be set in config.json
  ```
   enableTunnel: true/false
   bastionTunnel: bastian for tunnel if enableTunnel=true
   dstHostTunnel : destination host for tunneling if enableTunnel=true
   dstPortTunnel : destination port for tunneling if enableTunnel=true
   localPortTunnel: local port for tunnelling if enableTunnel=true
   privateKeyLocationTunnel: private key location for tunnel if enableTunnel=true

   dbName: Database name
   logLevel: default to info
   writeToFile: if you need to write to file
   fileLocation: location to export schema
 ```
#### How To use:

Set all the configurations and  build node app.
```
cd ~/influxdb-schema-auditor
npm install
node index.js
```
