'use strict';

const electron = require("electron");
const { remote } = require('electron')
const { Menu, MenuItem } = remote;
const { spawn } = require("child_process");
const { dialog } = require('electron').remote
const hljs = require('highlight.js');
const fs = require('fs');
const vis = require('vis');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

let filename = "/home/yuka/Halide/apps/autoscheduler/test/simple_test.cpp";

// Let user choose file if necessary.
let curmenu = Menu.getApplicationMenu();
let globalexec = execTest();
setFeatures();

curmenu.append(new MenuItem({ label: 'Open File', click() {
    filename = dialog.showOpenDialog({ properties: ['openFile'],  filters: [
        { name: 'Code', extensions: ['cpp', 'cxx'] }], })[0];
    const command =
        "cd /home/yuka/Halide/apps/autoscheduler; g++ "
        + filename + " -I bin/host -I ~/Halide/distrib/include -L ~/Halide/distrib/lib "
        + "-I /home/yuka/Halide/distrib/tools/ -lHalide -lpthread -ldl -lz -lrt -ltinfo -rdynamic -o "
        + path.parse(filename).name;

    const compile = exec(command,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);

            globalexec.kill();
            document.getElementById("input").addEventListener('keypress', inputListener, true);

            globalexec = execTest();
            setFeatures();
        });
}}));

Menu.setApplicationMenu(curmenu);

function execTest() {
    let node_attrs, edge_attrs;
    let nodes, edges;
    let colors = [' #0074D9 ', ' #7FDBFF ', ' #39CCCC ', ' #3D9970 ', ' #2ECC40 ', ' #FF851B ', ' #FF4136 ',  '#85144b ', ' #F012BE ', ' #B10DC9 ', ' #AAAAAA ', ' #DDDDDD '];

    const executable = "/home/yuka/Halide/apps/autoscheduler/" + path.parse(filename).name;
    const binary = spawn(executable,
        {
            env: {
                'LD_LIBRARY_PATH':'/home/yuka/Halide/apps/autoscheduler/bin/',
                'HL_CYOS':'1',
            },
        });
    binary.on('error', console.log);

    binary.stdout.on('data', (data) => {
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
            else if (json.type == "phase1" || json.type == "phase0" || json.type == "meta")
            {
                const e = document.getElementById("user");
                e.innerHTML = json.contents;
                if (json.type != "meta")
                    funcid = node_attrs.find(v => v.label === json.func).id;

            } else if (json.type == "schedule") 
            {
                const e = document.getElementById("schedule");
                const lines = json.contents;
                e.innerHTML = "";
                for (const idx in lines) {
                    const index = "<span style=\"background-color: #FFFF00\">" + idx + "</span> ";
                    let newline = "";

                    const div = document.createElement("div");
                    div.style.backgroundColor = colors[idx%(colors.length)];
                    for (const iidx in lines[idx]) {
                        let curline = lines[idx][iidx] + "<br>";
                        if (iidx != 0)
                            curline = "&nbsp;&nbsp;&nbsp;" + curline;
                        newline += curline;
                    }
                    div.innerHTML += index + newline;
                    e.appendChild(div);
                }
                e.scrollTop = e.scrollHeight;
            } else if (json.type == "cost") {
                const e = document.getElementById("cost");
                e.innerHTML = json.contents;
            } else if (json.type == "realize" ) {
                const e = document.getElementById("cost");
                e.innerHTML += ", " + json.contents + "ms";
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

    binary.stderr.on('data', (data) => {
        const e = document.getElementById("schedule");
        e.innerHTML += data;
        e.scrollTop = e.scrollHeight;
    });

    document.getElementById("input").addEventListener('keypress', inputListener);

    return binary;
}

function inputListener(e) {
    const key = e.keyCode;
    if (key !== 13) return;

    const input = e.target.value;
    e.target.value = '';
    globalexec.stdin.write(input + "\n");
};

function setFeatures() {
    fs.readFile(filename, 'utf-8', (err, data) => {
        const res = hljs.highlight("gml", data);
        document.getElementById("algorithm").innerHTML = res.value;
    });
};
