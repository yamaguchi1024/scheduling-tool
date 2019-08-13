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

const fs = require('fs');
fs.readFile("/home/yuka/Halide/apps/autoscheduler/test.cpp", 'utf-8', (err, data) => {
        document.getElementById("algorithm").innerText += data;
    });

ls.on('error', console.log);

ls.stdout.on('data', (data) => {
  const e = document.getElementById("schedule");
  e.value += data;
  e.scrollTop = e.scrollHeight;
});

ls.stderr.on('data', (data) => {
  const e = document.getElementById("schedule");
  e.value += data;
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
