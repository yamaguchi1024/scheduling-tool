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
ls.stdout.on('data', (data) => {
    const e = document.getElementById("schedule");
    const json = JSON.parse(data);
    if (json.type == "dag") {
        let node_attrs = new Array();
        for (let i = 0; i < json.nodes.length; i++) {
            node_attrs[i] = {
                id: i+1,
                label: json.nodes[i]
            };
        }
        let edge_attrs = new Array();
        for (let i = 0; i < json.edges.length; i++) {
            console.log(node_attrs.find(v => v.label === json.edges[i][0]));
            console.log(node_attrs.find(v => v.label === json.edges[i][1]));
            edge_attrs[i] = {
                from: node_attrs.find(v => v.label === json.edges[i][0]).id,
                to: node_attrs.find(v => v.label === json.edges[i][1]).id, arrows: {
                }
            }
        }

        let nodes = new vis.DataSet(node_attrs);
        let edges = new vis.DataSet(edge_attrs);
            let container = document.getElementById('dag');
            let data = {
            nodes: nodes,
            edges: edges
        };

        let options = {};
        let network = new vis.Network(container, data, options);
    }

    e.value = data;
    e.scrollTop = e.scrollHeight;
});

ls.stderr.on('data', (data) => {
    const e = document.getElementById("schedule");
    e.value = data;
    e.scrollTop = e.scrollHeight;
});

document.getElementById("input").addEventListener('keypress', (e) => {
    const key = e.keyCode;
    if (key !== 13) return;

    const input = e.target.value;
    e.target.value = '';
    console.log(`write ${input}`);
    ls.stdin.write(input + "\n");
});
