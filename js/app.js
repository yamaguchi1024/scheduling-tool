'use strict';

const electron = require("electron");
const { remote, ipcRenderer } = require('electron')
const { spawn } = require("child_process");
const hljs = require('highlight.js');
const fs = require('fs');
const vis = require('vis');
const path = require('path');

let filename = "/home/yuka/Halide/apps/scheduling-tool/test/unsharp_mask.cpp";
let globalexec = execTest();
let globalcolortable = {};
const colors = ["#884EA0", "#34495e", "#2471A3", "#172396", "#229954", "#65853c", "#96591b", "#a31e00"];

ipcRenderer.on('fileopen', (event, str) => {
    globalcolortable = {};
    filename = str;
    globalexec.kill();
    document.getElementById("input").addEventListener('keypress', inputListener, true);

    globalexec = execTest();
});

function execTest() {
    let node_attrs, edge_attrs;
    let nodes, edges;

    const executable = "/home/yuka/Halide/apps/scheduling-tool/bin/" + path.parse(filename).name;
    const binary = spawn(executable,
        {
            env: {
                'LD_LIBRARY_PATH':'/home/yuka/Halide/src/autoschedulers/adams2019/bin/:/home/yuka/Halide/distrib/lib/:/home/yuka/Halide/apps/scheduling-tool/bin',
                'HL_SCHEDULE_FILE':'/home/yuka/scheduling-tool/schedule_output.cpp'
            },
        });
    binary.on('error', console.log);

    binary.stdout.on('data', (data) => {
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
                        label: json.nodes[i],
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
                node_attrs.find(v => v.label === "lambda_0").label = "input";
                node_attrs.find(v => v.label === "repeat_edge").label = "bounded";

                nodes = new vis.DataSet(node_attrs);
                edges = new vis.DataSet(edge_attrs);
                let container = document.getElementById('dag');
                let network_data = {
                    nodes: nodes,
                    edges: edges
                };

                let options = {
                    edges: {
                        color: {
                            color: '#000000'
                        }
                    },
                    nodes: {
                        shape: 'box',
                        font: {
                            color: 'black',
                            size: 24,
                            face: 'monospace',
                        },
                        margin: 10
                    },
                    layout: {
                        hierarchical: {
                            direction: "LR",
                        }
                    }
                };
                let network = new vis.Network(container, network_data, options);
            }
            else if (json.type == "phase1")
            {
                document.getElementById('tile').classList.remove('inactive');
                const inst = document.getElementById("instruction");
                inst.innerHTML = json.instruction;
                inst.setAttribute("style", "font-family: monospace; text-decoration: underline;");

                const suggest = document.getElementById("suggestion");
                suggest.innerHTML = "";
                const costarray = json.cost.split(/\n/);
                const loadcostarray = json.load_costs.split(/\n/);
                const storecostarray = json.store_costs.split(/\n/);
                const computecostarray = json.compute_costs.split(/\n/);
                const tilingarray = json.tiling.split(/\n/);
                for (let i in costarray) {
                    const button = document.createElement("button");
                    button.onclick = function() {
                        globalexec.stdin.write("0 " + i + "\n");
                        document.getElementById('tile').classList.add('inactive');
                    };
                    button.onmouseover = function() {
                        button.style.backgroundColor = "#FFEF00";
                    };
                    button.onmouseout = function() {
                        button.style.backgroundColor = "#FFFFFF";
                    };
                    button.setAttribute("style", "text-align: left; font-family: monospace;");
                    let line = "(" + tilingarray[i] + ")";
                    button.innerHTML = line;
                    button.style.backgroundColor = "#FFFFFF";

                    const cdiv = document.createElement("div");
                    cdiv.setAttribute("style", "text-align: right; float: right; height: 25px; margin-right: 6px;");
                    cdiv.innerHTML =  '<span style="color: black; font-family: monospace;">Cost: </span>' + costarray[i];

                    const c = document.createElement("div");
                    c.setAttribute("id", "popup_phase1");
                    c.setAttribute("style", "margin-left: -140px; display: none; background-color: #DDDDDD; text-align: left; width: 200px; position: absolute; z-index: 1; border: 1px solid black; color: black");
                    c.innerHTML +=  "load cost: " + loadcostarray[i];
                    c.innerHTML +=  "<br> store cost: " + storecostarray[i];
                    c.innerHTML +=  "<br> compute cost: " + computecostarray[i];

                    cdiv.onmouseover = function() {
                        cdiv.children[1].style.display = 'block';
                    };
                    cdiv.onmouseout = function() {
                        cdiv.children[1].style.display = 'none';
                    };

                    cdiv.appendChild(c);
                    cdiv.style.color = "#FF6666";

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
                const line_cost = json.costs;
                const load_cost = json.load_costs;
                const store_cost = json.store_costs;
                const compute_cost = json.compute_costs;
                const linenum = json.linenum;

                draw_button_cost(linenum, line_cost, load_cost, store_cost, compute_cost);

            }else if (json.type == "schedule")
            {
                const lines = json.contents;
                let functable = {};
                const latestSeg = {};
                latestSeg[0] = 0;
                const parentSeg = {};
                const segments = new Array(lines.length);
                segments[0] = [-1, 1, 1, "source", "top", ""];
                for (const idx in lines) {
                    let func;
                    let vectorized = false;
                    let parallel = false;
                    let sched_lines = [];

                    for (const iidx in lines[idx]) {
                        let curline = lines[idx][iidx];

                        if (curline.includes("for")) {
                            const nestcount = (curline.match(/&nbsp;/g) || []).length / 4;
                            const l = curline.replace(/&nbsp;/g, " ");
                            let regexp = /for[ ]+(.+)\.(.)[ ]+in[ ]+0\.\.([0-9]+)/;
                            let m = l.match(regexp);
                            const fname = m[1];
                            const xory = m[2];
                            const min = 0;
                            const max = m[3];
                            const range = max - min + 1;

                            latestSeg[nestcount] = parseInt(idx);
                            parentSeg[idx] = latestSeg[nestcount - 1];
                            if (xory == "x") {
                                segments[idx] = [parentSeg[idx], range, -1, "", fname, ""];
                            }
                            if (xory == "y")
                                segments[idx][2] = range;
                            if (vectorized)
                                segments[idx][3] = "vectorized";
                            if (parallel)
                                segments[idx][3] = "parallel";
                        }
                        // vectorized?
                        if (curline.match(/(vectorized)/) != null)
                            vectorized = true;
                        else if (curline.match(/(parallel)/) != null)
                            parallel = true;
                        else
                            sched_lines.push(curline);

                        let fname = curline.match(/[?].*[?]/);
                        if (fname != null) {
                            curline = curline.replace(fname,'');
                            func = fname[0].slice(1,-1);
                        }
                    }

                    if (segments[idx] != null)
                        segments[idx][5] = sched_lines;

                    if (idx == 0) func = "top";

                    if (func in functable) functable[func].push(parseInt(idx));
                    else  functable[func] = [parseInt(idx)];

                    if (!(func in globalcolortable))
                        globalcolortable[func] = colors[Object.keys(globalcolortable).length%(colors.length)];
                }

                draw(segments);
            } else if (json.type == "cost") {
                const e = document.getElementById("cost");
                e.innerHTML = "";

                const span = document.createElement("span");
                span.onmouseover = function() {
                    document.getElementById('popup').style.display = 'block';
                };
                span.onmouseout = function() {
                    document.getElementById('popup').style.display = 'none';
                };
                span.innerText = json.contents;
                span.setAttribute("style", "color: #FF6666;");

                e.setAttribute("style", "font-family: monospace;");
                e.appendChild(document.createTextNode('Current Cost: '));
                e.appendChild(span);
                e.appendChild(document.createTextNode(' '));

                const load_cost = json.load_costs;
                const store_cost = json.store_costs;
                const compute_cost = json.compute_costs;

                const c = document.createElement("div");
                c.setAttribute("id", "popup");
                c.setAttribute("style", "bottom: 28px; display: none; background-color: #DDDDDD; text-align: left; width: 200px; position: absolute; z-index: 1; border: 1px solid;");
                c.innerHTML += "load cost: " + load_cost;
                c.innerHTML += "<br>store cost: " + store_cost;
                c.innerHTML += "<br>compute cost: " + compute_cost;

                e.appendChild(c);

                const undobutton = document.createElement("button");
                undobutton.onclick = function() {
                    globalexec.stdin.write("-1 -1\n");
                };
                undobutton.onmouseover = function() {
                    undobutton.style.backgroundColor = "#FFEF00";
                };
                undobutton.onmouseout = function() {
                    undobutton.style.backgroundColor = "#FFFFFF";
                };
                undobutton.setAttribute("style", "text-align: left");
                undobutton.innerHTML = "undo";
                undobutton.style.backgroundColor = "#FFFFFF";

                const redobutton = document.createElement("button");
                redobutton.onclick = function() {
                    globalexec.stdin.write("-2 -2\n");
                };
                redobutton.onmouseover = function() {
                    redobutton.style.backgroundColor = "#FFEF00";
                };
                redobutton.onmouseout = function() {
                    redobutton.style.backgroundColor = "#FFFFFF";
                };
                redobutton.setAttribute("style", "text-align: left");
                redobutton.innerHTML = "redo";
                redobutton.style.backgroundColor = "#FFFFFF";

                e.appendChild(undobutton);
                e.appendChild(redobutton);
            }
        }

        // Change color here
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes.get(i+1);
            n.color = {
                background: 'white',
                border: 'black'
            };
            n.font = {
                color: 'black',
                size: 24,
                face: 'monospace',
            };
            nodes.update(n);
        }

        let func = nodes.get(funcid);
        func.color = '#E60000';
        func.font = {
            color: 'white',
            size: 24,
            face: 'monospace',
        };
        nodes.update(func);
    });

    binary.stderr.on('data', (data) => {
        const e = document.getElementById("instruction");
        e.innerHTML += " " + data;
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
    document.getElementById('tile').classList.add('inactive');
};
