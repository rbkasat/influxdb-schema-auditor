const Influx = require('influx')
const express = require('express')
const http = require('http')
const os = require('os')
const async = require('async')
var tunnel = require('tunnel-ssh');
var Table = require('cli-table');
const winston = require('winston')
var config = require('./config.json');
const fs = require('fs')
winston.log('info', 'Starting the Audit!')
winston.level = config.logLevel

var tunnelConfig = {
    host: config.bastionTunnel,
    port: 22,
    dstHost: config.dstHostTunnel,
    dstPort: config.dstPortTunnel,
    localHost: '127.0.0.1',
    localPort: config.localPortTunnel,
    privateKey: fs.readFileSync(config.privateKeyLocationTunnel),
};

tunnel(tunnelConfig, function (error, server) {
    if (error) {
        console.log('error', "failed to tunnel");
        return;
    }
    winston.log('info', "tunnelling was successful! Now starting to fetch measurements.")
    const influx = new Influx.InfluxDB({
        host: '127.0.0.1',
        database: config.dbName
    })

    influx.query(`
     show measurements 
  `).then(result => {
        var points = []
        winston.log('info', "Starting To fetch tag keys per measurement!")

        result.forEach(function (element) {
            var s = `show tag keys from  ${Influx.escape.quoted(element.name)}`
            winston.log('debug', s)
            points.push(function (callback) {
                influx.query(s).then(result => {
                    callback(null, {"result": result, "measurement": element["name"]});
                }).catch(err => {
                    console.log("error")
                    callback(null, {"result": [], "measurement": element["name"]});
                });
            });
        });
        async.parallelLimit(points, 5, function (err, results) {
            if (err) {
                console.error("Metrics parallel post failed.", err);
            }

            results.forEach(function (key) {
                winston.log('debug', "----------------------")
                winston.log('debug', key["measurement"]);
                winston.log('debug', "----------------------")

                key["result"].forEach(function (val) {
                    winston.log('debug', val["tagKey"])
                })

            })
            winston.log('info', "Starting To fetch tag values per tag!")
            var cardin = []
            results.forEach(function (element) {
                element["result"].forEach(function (val) {
                    cardin.push(function (callback) {

                        var s = `show tag values from ${Influx.escape.quoted(element.measurement)} with key = ${Influx.escape.quoted(val.tagKey)}`;
                        influx.query(s).then(result => {
                            var x = []
                            result.forEach(function (s) {
                                x.push(s.value)
                            })
                            winston.log('debug', s, JSON.stringify(x, null, 4))

                            callback(null, {
                                "result": x,
                                "measurement": element["measurement"],
                                "tag": val["tagKey"]
                            });
                        }).catch(err => {
                            console.log("error")
                            callback(null, {"result": [], "measurement": element["measurement"]});
                        });
                    });
                });
            });
            async.parallelLimit(cardin, 20, function (err, results) {
                if (err) {
                    winston.log('error', "Error in parrallel processing of tag values .", err);
                }
                results.sort((a, b) => parseFloat(parseFloat(b.result.length) - a.result.length));
                winston.log('info', "Printing Results now!")
                var table = new Table({
                    head: ['Measurement', 'Tag Key', 'Values Count']
                    , colWidths: [30, 30, 20]
                });
                results.forEach(function (key) {
                    table.push([key["measurement"], key["tag"], key["result"].length])
                })
                console.log(table.toString());
                if (config.writeToFile) {
                    fs.writeFile(config.fileLocation, JSON.stringify(results, null, 4), function (err) {
                        if (err) {
                            return console.log(err);
                        }

                        console.log("The file was saved!");
                    });
                }
                winston.log('info', "----------Finished!------------")

            });

        }, 5);
    });
});