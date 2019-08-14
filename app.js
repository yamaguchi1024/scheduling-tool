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

ls.stdout.on('data', (data) => {
    const e = document.getElementById("schedule");
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
