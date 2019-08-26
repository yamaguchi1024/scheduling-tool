'use strict';

const electron = require("electron");
const { remote, ipcRenderer } = require('electron')
const { spawn } = require("child_process");
const hljs = require('highlight.js');
const fs = require('fs');
const vis = require('vis');
const path = require('path');

let filename = "/home/yuka/Halide/apps/scheduling-tool/test/simple_test.cpp";

ipcRenderer.on('fileopen', (event, str) => {
    filename = str;
    globalexec.kill();
    document.getElementById("input").addEventListener('keypress', inputListener, true);

    globalexec = execTest();
    setFeatures();
});

let globalexec = execTest();
setFeatures();

function execTest() {
    let node_attrs, edge_attrs;
    let nodes, edges;
    let colors = [' #0074D9 ', ' #7FDBFF ', ' #39CCCC ', ' #3D9970 ', ' #2ECC40 ', ' #FF851B ', ' #FF4136 ',  '#85144b ', ' #F012BE ', ' #B10DC9 ', ' #AAAAAA ', ' #DDDDDD '];

    const executable = "/home/yuka/Halide/apps/scheduling-tool/bin/" + path.parse(filename).name;
    const binary = spawn(executable,
        {
            env: {
                'LD_LIBRARY_PATH':'/home/yuka/Halide/apps/scheduling-tool/bin/'
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
                else if (json.type == "phase1")
            {
                const inst = document.getElementById("instruction");
                inst.innerHTML = json.instruction;
                inst.innerHTML += " or type tiling size (y x)";

                const suggest = document.getElementById("suggestion");
                suggest.innerHTML = "";
                const costarray = json.cost.split(/\n/);
                const tilingarray = json.tiling.split(/\n/);
                for (let i in costarray) {
                    const button = document.createElement("button");
                    button.onclick = function() {
                        globalexec.stdin.write("0 " + i + "\n");
                    };
                    button.onmouseover = function() {
                        button.style.backgroundColor = "#FFDC00";
                    };
                    button.onmouseout = function() {
                        button.style.backgroundColor = "#FFFFFF";
                    };
                    button.setAttribute("style", "text-align: left");
                    let line = "(" + tilingarray[i] + ")";
                    button.innerHTML = line;
                    button.style.backgroundColor = "#FFFFFF";

                    const cdiv = document.createElement("div");
                    cdiv.setAttribute("style", "text-align: right; float: right;");
                    cdiv.innerHTML =  " cost: " + costarray[i];
                    cdiv.style.backgroundColor = "#FF4136";

                    const div = document.createElement("div");
                    div.setAttribute("style", "padding: 0; margin: 0px;");
                    div.appendChild(button);
                    div.appendChild(cdiv);
                    suggest.appendChild(div);
                }
                
                funcid = node_attrs.find(v => v.label === json.func).id;
            }
                else if (json.type == "phase0")
            {
                const e = document.getElementById("instruction");
                e.innerHTML = json.contents;
                document.getElementById("input").disabled = true;
                funcid = node_attrs.find(v => v.label === json.func).id;

                // Hide phase 1 items here
                const suggest = document.getElementById("suggestion");
                const nodes = suggest.children;
                for (let n of nodes) {
                    n.children[0].disabled = true;
                    if (n.children[1] == undefined) continue;
                    n.removeChild(n.children[1]);
                }
            }
                else if (json.type == "meta")
            {
                const e = document.getElementById("instruction");
                e.innerHTML = json.contents;

            }
                else if (json.type == "line_cost")
            {
                const e = document.getElementById("schedule");
                const line_cost = json.costs;
                const load_cost = json.load_costs;
                const store_cost = json.store_costs;
                const compute_cost = json.compute_costs;
                const linenum = json.linenum;
                const nodes = e.children;
                for (let i in nodes) {
                    if (i != linenum) continue;
                    const stage = nodes[i];
                    if (stage.children == undefined) continue;
                    const cost_div = stage.children[1];
                    cost_div.innerHTML += "sumcost: " + line_cost;
                    cost_div.innerHTML += "<br>load cost: " + load_cost;
                    cost_div.innerHTML += "<br>store cost: " + store_cost;
                    cost_div.innerHTML += "<br>compute cost: " + compute_cost;
                    cost_div.style.backgroundColor = "#FF4136";
                }
            }else if (json.type == "schedule")
            {
                const e = document.getElementById("schedule");
                const lines = json.contents;
                e.innerHTML = "";
                for (const idx in lines) {
                    const index = "<span style=\"background-color: #FFFF00\">" + idx + "</span> ";
                    let newline = "";

                    const button = document.createElement("button");
                    button.onclick = function() {
                        globalexec.stdin.write(idx + "\n");
                        document.getElementById("input").disabled = false;
                    };
                    let prevcolor;
                    button.onmouseover = function() {
                        prevcolor = button.style.backgroundColor;
                        button.style.backgroundColor = "#FFDC00";
                    };
                    button.onmouseout = function() {
                        button.style.backgroundColor = prevcolor;
                    };
                    button.setAttribute("style", "text-align: left");
                    button.style.backgroundColor = colors[idx%(colors.length)];
                    for (const iidx in lines[idx]) {
                        let curline = lines[idx][iidx] + "<br>";
                        if (iidx != 0)
                            curline = "&nbsp;&nbsp;&nbsp;" + curline;
                        newline += curline;
                    }
                    button.innerHTML += index + newline;

                    const linecost = document.createElement("div");
                    linecost.setAttribute("style", "text-align: right; float: right; overflow-y:scroll; height: 25px;");
                    linecost.setAttribute("id", "linecost");

                    const div = document.createElement("div");
                    div.setAttribute("style", "padding: 0; margin: 0px;");
                    div.appendChild(button);
                    div.appendChild(linecost);
                    e.appendChild(div);
                }
                e.scrollTop = e.scrollHeight;
            } else if (json.type == "cost") {
                const e = document.getElementById("cost");
                e.innerHTML = "";
                const load_cost = json.load_costs;
                const store_cost = json.store_costs;
                const compute_cost = json.compute_costs;

                const c = document.createElement("div");
                c.setAttribute("style", "text-align: right; float: left; overflow-y:scroll; height: 23px;");
                c.innerHTML = json.contents;
                c.innerHTML += "<br>load cost: " + load_cost;
                c.innerHTML += "<br>store cost: " + store_cost;
                c.innerHTML += "<br>compute cost: " + compute_cost;

                e.appendChild(c);
            } else if (json.type == "realize" ) {
                const e = document.getElementById("cost");
                e.innerHTML += json.contents + "ms";
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
