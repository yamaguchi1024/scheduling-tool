const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow} = electron;

let mainWindow;

app.on('window-all-closed', function() {
        if(process.platform !== 'darwin') {
                app.quit();
        };
});

app.on('ready', function() {
        mainWindow = new BrowserWindow({});

        // file://dirname/index.html
        mainWindow.loadURL(url.format({
                pathname: path.join(__dirname, 'index.html'),
                protocol: 'file',
                slashes: true
        }));

        mainWindow.on('closed', function() {
                app.quit();
        });
});
