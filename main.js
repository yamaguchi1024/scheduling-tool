const electron = require('electron');
const url = require('url');
const path = require('path');
const { Menu, MenuItem } = require('electron');

const {app, BrowserWindow} = electron;

let mainWindow;

app.on('window-all-closed', function() {
    if(process.platform !== 'darwin') {
        app.quit();
    };
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
        },
    });

    // file://dirname/index.html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));

    mainWindow.on('closed', function() {
        app.quit();
    });

    global.filename = "/home/yuka/Halide/apps/scheduling-tool/test/simple_test.cpp";
    let curmenu = Menu.getApplicationMenu();
    // Let user choose file if necessary.
    curmenu.append(new MenuItem({ label: 'Open File', click() {
        global.filename = dialog.showOpenDialog({ properties: ['openFile'],  filters: [
            { name: 'Code', extensions: ['cpp', 'cxx'] }], })[0];
        const command =
            "cd /home/yuka/Halide/apps/scheduling-tool; "
            + "g++ -O3 -std=c++11 -I /home/yuka/Halide/distrib/include/ -I /home/yuka/Halide/distrib/tools/ "
            + "-Wno-unused-function -Wcast-qual -Wignored-qualifiers -Wno-comment -Wsign-compare "
            + "-Wno-unknown-warning-option -Wno-psabi -rdynamic " + global.filename
            + " /home/yuka/Halide/apps/scheduling-tool/bin/libscheduling_tool.so -o "
            + " ./bin/" + path.parse(global.filename).name + " -ldl -lpthread -lz /home/yuka/Halide/distrib/bin/libHalide.so "
            + "-lz -lrt -ldl -ltinfo -lpthread -lm -lxml2"

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
});
