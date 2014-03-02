var stream = require('stream')
  , util = require('util');


// Give our device a stream interface
util.inherits(RazumdomDevice,stream);
util.inherits(RazumdomHandler,stream);

// Export it
module.exports=RazumdomHandler;


var exec = require('child_process').exec;

function RazumdomDevice(V, D, G, name) {

  var self = this;

  // This device will emit data
  this.readable = true;
  // This device can be actuated
  this.writeable = false;

  this.V = V;
  this.D = D;
  this.G = G;
  this.name = name;


};

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

function guid(device) {
	return [device.G,device.V,device.D].join('_');
};


function RazumdomHandler(opts, app, driver, modbusAddr) {
    var self = this;
    self.driver = driver;
    console.log("RazumdomHandler");

    this.registeredDevices = {};

    this.modbusAddr = modbusAddr;
    self.modbusCmd = "/root/modbus_client --debug -m rtu -s2 -pnone /dev/ttyNSC0 -a0x01 ";
    self.scanDevice();



    setInterval(function() {self.readData(); }, 5000);

    //~ setInterval(function() {    self.scanDevice();}, 10000);
};

RazumdomHandler.prototype.registerDevice = function(deviceG, deviceV, deviceD, deviceName) {
	var device = new RazumdomDevice(deviceV, deviceD, deviceG, deviceName);
	// If we already have a device for this guid, bail.
	if (this.registeredDevices[guid(device)]) return device;


	this.driver.emit('register', device);
	this.registeredDevices[guid(device)] = device;
	return device;
}

RazumdomHandler.prototype.sendData = function(deviceObj) {
	if(!deviceObj) { return; }
	var device = this.registeredDevices[guid(deviceObj)];
	if (!device) {
		device = this.registerDevice(deviceObj.G, deviceObj.V, deviceObj.D, deviceObj.name);
	}
    //~ console.log("device=" + device);
	device.emit('data', deviceObj.DA);
};





RazumdomHandler.prototype.scanDevice = function() {
    var self = this;
    console.log("scanDevice");

    //~ self.registerDevice(self.modbusAddr, 0, 7, "Razumdom " + self.modbusAddr);


};

RazumdomHandler.prototype.readData = function() {
    var self = this;
    console.log("readData");

    exec(self.modbusCmd + " -t0x04 -r0 -c4", function (error, stdout, stderr) {
        if (error !== null) {
            console.log("modbus readdata error: " + stderr);
        } else {
            console.log("stdout = " + stdout);

            if (stdout.indexOf("SUCCESS") != -1) {
                var match = stdout.match(/Data: (0x[0-9a-f]{4}) (0x[0-9a-f]{4}) (0x[0-9a-f]{4}) (0x[0-9a-f]{4})/);
                if (match) {


                    var val1 = parseInt(match[1]);
                    console.log("val1 = " + val1);


                    //~ var value = (val1 == 0x64) ? 0 : 1;
                    var value = val1;
                    self.sendData( { 'V' : 0, 'D' : 202, 'G' : self.modbusAddr, 'name' : "Razumdom " + self.modbusAddr, 'DA':  value });
                }
            }

        }
    });
};
