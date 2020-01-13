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
});

let globalexec = execTest();
let globalcolortable;
let colors = {"red" : ["#f9b0a9", "#f79a91", "#f68479", "#f4695d"], "blue" : ["#cbcbfb", "#bcbcfa", "#a0a0f8", "#8888f7", "#6666f4"], 
    "orange" : ["#f8cd9b", "#f6c183", "#f4b266", "#f3a64f"], "green" : ["#83f6b7", "#6bf5a9", "#4af296", "#24f07f"]};
let abstcolors = ["red", "blue", "orange", "green"];

function execTest() {
    let node_attrs, edge_attrs;
    let nodes, edges;

    const executable = "/home/yuka/Halide/apps/scheduling-tool/bin/" + path.parse(filename).name;
    const binary = spawn(executable,
        {
            env: {
                'LD_LIBRARY_PATH':'/home/yuka/Halide/apps/scheduling-tool/bin/',
                'HL_SCHEDULE_FILE':'/home/yuka/scheduling-tool/schedule_output.cpp'
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

                let options = {
                    layout: {
                        hierarchical: {
                            direction: "LR",
                        }
                    },
                    nodes: {
                        shape: 'box'
                    }
                };
                let network = new vis.Network(container, network_data, options);
            }
            else if (json.type == "phase1")
            {
                document.getElementById('tile').classList.remove('inactive');
                const inst = document.getElementById("instruction");
                inst.innerHTML = json.instruction;
                inst.innerHTML += " or type tiling size (y x)";

                const suggest = document.getElementById("suggestion");
                suggest.innerHTML = "";
                const costarray = json.cost.split(/\n/);
                const runtimearray = json.runtime.split(/\n/);
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
                    const rdiv = document.createElement("div");
                    cdiv.setAttribute("style", "text-align: right; float: right; height: 25px; margin-right: 6px;");
                    cdiv.innerHTML =  costarray[i];
                    rdiv.innerHTML =  parseFloat(runtimearray[i]).toFixed(3) + "ms";
                    rdiv.setAttribute("style", "text-align: right; float: right; height: 25px;");
                    //rdiv.style.backgroundColor = "#3189e8";
                    rdiv.style.color = "#3189e8";

                    const c = document.createElement("div");
                    c.setAttribute("id", "popup_phase1");
                    c.setAttribute("style", "margin-left: -140px; display: none; background-color: #DDDDDD; text-align: left; width: 200px; position: absolute; z-index: 1;");
                    c.innerHTML +=  "load cost: " + loadcostarray[i];
                    c.innerHTML +=  "<br> store cost: " + storecostarray[i];
                    c.innerHTML +=  "<br> compute cost: " + computecostarray[i];

                    cdiv.onmouseover = function() {
                        cdiv.children[0].style.display = 'block';
                    };
                    cdiv.onmouseout = function() {
                        cdiv.children[0].style.display = 'none';
                    };

                    cdiv.appendChild(c);
                    //cdiv.style.backgroundColor = "#FF4136";
                    cdiv.style.color = "#FF6666";

                    const div = document.createElement("div");
                    div.setAttribute("style", "padding: 0; margin: 0px;");
                    div.appendChild(button);
                    div.appendChild(rdiv);
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
                const runtime = json.runtime;
                const linenum = json.linenum;
                const nodes = e.children;
                for (let i in nodes) {
                    if (i != linenum) continue;
                    const stage = nodes[i];
                    if (stage.children == undefined) continue;
                    const cost_div = stage.children[1];
                    const cdiv = document.createElement("div");
                    const rdiv = document.createElement("div");
                    cdiv.setAttribute("style", "text-align: right; float: right; height: 25px;");
                    cdiv.style.backgroundColor = "#FF4136";
                    rdiv.setAttribute("style", "text-align: right; float: right; height: 25px; margin-right: 4px;");
                    rdiv.style.backgroundColor = "#3189e8";

                    cdiv.innerHTML = "cost: " + line_cost;
                    rdiv.innerHTML = "runtime: " + runtime + "ms";

                    const c = document.createElement("div");
                    c.setAttribute("style", "margin-left: -140px; display: none; background-color: #DDDDDD; text-align: left; width: 200px; position: absolute; z-index: 1;");
                    c.innerHTML +=  "load cost: " + load_cost;
                    c.innerHTML +=  "<br> store cost: " + store_cost;
                    c.innerHTML +=  "<br> compute cost: " + compute_cost;

                    cdiv.onmouseover = function() {
                        cdiv.children[0].style.display = 'block';
                    };
                    cdiv.onmouseout = function() {
                        cdiv.children[0].style.display = 'none';
                    };

                    cdiv.appendChild(c);
                    cost_div.appendChild(cdiv);
                    cost_div.appendChild(rdiv);
                }
            }else if (json.type == "schedule")
            {
                const e = document.getElementById("schedule");
                const lines = json.contents;
                updateVis(lines);
                const phase = parseInt(json.phase);
                const curfunc = json.func;
                let functable = {};
                e.innerHTML = "";
                for (const idx in lines) {
                    const index = "<span style=\"background-color: #FFFF00\">" + idx + "</span> ";
                    let newline = "";
                    let func;

                    const button = document.createElement("button");
                    let buttonbackgroundchange = true;
                    for (const iidx in lines[idx]) {
                        let curline = lines[idx][iidx];
                        let fname = curline.match(/[?].*[?]/);
                        if (fname != null) {
                            curline = curline.replace(fname,'');
                            func = fname[0].slice(1,-1);
                        }

                        // tilable?
                        if (curline.match(/(tileable)/) != null) {
                            if (func == curfunc && phase == 1)
                                buttonbackgroundchange = false;
                        }

                        // parse line and identify this block
                        curline += "<br>";
                        if (iidx != 0)
                            curline = "&nbsp;&nbsp;&nbsp;" + curline;
                        newline += curline;
                    }

                    if (func in functable) functable[func].push(parseInt(idx));
                    else  functable[func] = [parseInt(idx)];

                    if (globalcolortable == undefined) {
                        globalcolortable = {};
                        globalcolortable[func] = abstcolors[0];
                    } else if (!(func in globalcolortable))
                        globalcolortable[func] = abstcolors[Object.keys(globalcolortable).length%(abstcolors.length)];

                    let buttonbackground =
                        buttonbackgroundchange ? colors[globalcolortable[func]][idx%(colors[globalcolortable[func]].length)] : "#00FF00";

                    button.innerHTML += index + newline;

                    button.onclick = function() {
                        globalexec.stdin.write(idx + " -1\n");
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

                    button.style.backgroundColor = buttonbackground;

                    const linecost = document.createElement("div");
                    linecost.setAttribute("style", "text-align: right; float: right;");
                    linecost.setAttribute("id", "linecost");

                    const div = document.createElement("div");
                    div.setAttribute("style", "padding: 0; margin: 0px;");
                    div.appendChild(button);
                    div.appendChild(linecost);
                    e.appendChild(div);
                }
            } else if (json.type == "cost") {
                const e = document.getElementById("cost");
                e.innerHTML = json.contents + "&nbsp";

                const load_cost = json.load_costs;
                const store_cost = json.store_costs;
                const compute_cost = json.compute_costs;

                const c = document.createElement("div");
                c.setAttribute("id", "popup");
                c.setAttribute("style", "display: none; background-color: #DDDDDD; text-align: left; width: 200px; position: absolute; z-index: 1;");
                c.innerHTML += "load cost: " + load_cost;
                c.innerHTML += "<br>store cost: " + store_cost;
                c.innerHTML += "<br>compute cost: " + compute_cost;

                e.onmouseover = function() {
                    document.getElementById('popup').style.display = 'block';
                };
                e.onmouseout = function() {
                    document.getElementById('popup').style.display = 'none';
                };

                e.appendChild(c);
            } else if (json.type == "realize" ) {
                const e = document.getElementById("cost");
                e.innerHTML += json.contents + "ms  ";

                const undobutton = document.createElement("button");
                undobutton.onclick = function() {
                    globalexec.stdin.write("-1 -1\n");
                };
                undobutton.onmouseover = function() {
                    undobutton.style.backgroundColor = "#FFDC00";
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
                    redobutton.style.backgroundColor = "#FFDC00";
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
