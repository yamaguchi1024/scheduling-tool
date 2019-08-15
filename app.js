'use strict';

const electron = require("electron");
const { spawn } = require("child_process");
const ls = spawn('/home/yuka/Halide/apps/autoscheduler/test',
    {
        env: {
            'LD_LIBRARY_PATH':'/home/yuka/Halide/apps/autoscheduler/bin/',
            'HL_CYOS':'1',
        },
    });

let filename = "/home/yuka/Halide/apps/autoscheduler/test.cpp";
/*
const command = "cd /home/yuka/Halide/apps/autoscheduler; g++ " + filename + " -I bin/host -I ~/Halide/distrib/include -L ~/Halide/distrib/lib -I /home/yuka/Halide/distrib/tools/ -lHalide -lpthread -ldl -lz -lrt -ltinfo -rdynamic -o neko1";
const exec = require("child_process").exec;
const compile = exec(command,
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
  });
  */

const fs = require('fs');
fs.readFile(filename, 'utf-8', (err, data) => {
    document.getElementById("algorithm").value += data;
});

ls.on('error', console.log);

const vis = require('vis');
let node_attrs, edge_attrs;
let nodes, edges;
ls.stdout.on('data', (data) => {
    const e = document.getElementById("schedule");
    const iarray = data.toString().split(/\n/);
    let funcid;
    for (let element of iarray) {
        if (!element.includes("type"))
            continue;
        const json = JSON.parse(element);
        if (json.type == "dag") {
            node_attrs = new Array();
            for (let i = 0; i < json.nodes.length; i++) {
                node_attrs[i] = {
                    id: i+1,
                    label: json.nodes[i]
                };
            }
            edge_attrs = new Array();
            for (let i = 0; i < json.edges.length; i++) {
                edge_attrs[i] = {
                    from: node_attrs.find(v => v.label === json.edges[i][0]).id,
                    to: node_attrs.find(v => v.label === json.edges[i][1]).id,
                    arrows: {
                        to: {
                            enabled: true
                        }
                    }
                }
            }

            nodes = new vis.DataSet(node_attrs);
            edges = new vis.DataSet(edge_attrs);
            let container = document.getElementById('dag');
            let network_data = {
                nodes: nodes,
                edges: edges
            };

            let options = {};
            let network = new vis.Network(container, network_data, options);
        }
        else if (json.type == "phase1" || json.type == "phase0")
        {
            const e = document.getElementById("user");
            e.innerHTML = json.contents;
            funcid = node_attrs.find(v => v.label === json.func).id;

        } else if (json.type == "schedule") 
        {
            const e = document.getElementById("schedule");
            e.value = json.contents;
            e.scrollTop = e.scrollHeight;
        }
    }

    // Change color here
    for (let i = 0; i < nodes.length; i++) {
        let n = nodes.get(i+1);
        n.color = "cyan";
        nodes.update(n);
    }

    let func = nodes.get(funcid);
    func.color = "lime";
    nodes.update(func);
});

ls.stderr.on('data', (data) => {
    const e = document.getElementById("schedule");
    e.value += data;
    e.scrollTop = e.scrollHeight;
    console.log(data.toString());
});

document.getElementById("input").addEventListener('keypress', (e) => {
    const key = e.keyCode;
    if (key !== 13) return;

    const input = e.target.value;
    e.target.value = '';
    console.log(`write ${input}`);
    ls.stdin.write(input + "\n");
});
