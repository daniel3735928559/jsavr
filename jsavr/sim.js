var app = app || angular.module('app', []);

app.controller("AvrSimController", function($scope){

    $scope.cm_setup = function(){
	$scope.editor = CodeMirror.fromTextArea(document.getElementById("simavr"+$scope.simid+"_program_area"), {
	    lineNumbers: true,
	    gutters: ["breakpoints", "CodeMirror-linenumbers"]
	});
	if($scope.program != ""){
	    $scope.editor.setSize(null, ($scope.program.split("\n").length + 2)*($scope.editor.defaultTextHeight()) + 10);
	}
	else{
	    $scope.editor.setSize(null, "100%");
	}
	$scope.editor.setValue($scope.program);
    }
    $scope.current_inst = "ldi r31,9";
    $scope.PC_display_mode = "t";
    $scope.RAM_display_mode = "d";
    $scope.RF_display_mode = "d";
    $scope.program = "ldi r31,9\nadd r30,r31\nadd r30,r30\nadd r30,r30\ncp r30,r31\ncpi r30,36\nbreq 125\ninc r0\nadd r0,r30\nldi r31,0\nldi r30,11\nst Z,r0\nld r1,Z";
    $scope.RAM = [];
    $scope.PM = [];
    $scope.RF = [];
    $scope.RAM_size = 32;
    $scope.PM_size = 32;
    $scope.RF_size = 32;
    $scope.updated = [];
    $scope.reset = function(pm_reset){
	$scope.PC = 0;
	$scope.Z = 0;
	$scope.C = 0;
	$scope.O = 0;
	$scope.updated = [];
	for(var i = 0; i < $scope.RF_size; i++) $scope.RF[i] = 0;
	for(var i = 0; i < $scope.RAM_size; i++) $scope.RAM[i] = 0;
	if(pm_reset){ for(var i = 0; i < $scope.PM_size; i++) $scope.PM[i] = $scope.parse("nop"); }
    }
    $scope.change_program = function(prog){
	$scope.program = prog;
	if($scope.editor) $scope.editor.setValue(prog);
    }
    $scope.display_ram = function(i){
	if($scope.RAM_display_mode == "d"){
	    return $scope.RAM[i];
	}
	else if($scope.RAM_display_mode == "b"){
	    var s = $scope.RAM[i].toString(2);
	    return smul("0",8-s.length)+s;
	}
	else if($scope.RAM_display_mode == "h"){
	    var s = $scope.RAM[i].toString(16);
	    return "0x"+smul("0",2-s.length)+s;
	}
    }
    $scope.display_rf = function(i){
	if($scope.RF_display_mode == "d"){
	    return $scope.RF[i];
	}
	else if($scope.RF_display_mode == "b"){
	    var s = $scope.RF[i].toString(2);
	    return smul("0",8-s.length)+s;
	}
	else if($scope.RF_display_mode == "h"){
	    var s = $scope.RF[i].toString(16);
	    return "0x"+smul("0",2-s.length)+s;
	}
    }
    $scope.program_pm = function(){
	$scope.reset();
	$scope.program = $scope.editor.getValue();
	var lines = $scope.program.split("\n");
	var pm_addr = 0;
	for(var i = 0; i < lines.length; i++){
	    var inst = $scope.parse(lines[i]);
	    if(!(inst.label)){
		$scope.PM[pm_addr] = inst;
		pm_addr++;
	    }
	}
    }
    $scope.submit = function(){
	alert("Not yet implemented");
    }
    $scope.parse = function(inst){
	var matches = inst.match(/([^ ]+)* *(.*)/)
	var mnemonic = matches[1];
	var operand = matches[2];
	console.log(mnemonic, "|||", operand);
	if(mnemonic in $scope.instructions){
	    var format = $scope.instructions[mnemonic].format;
	    var execf = $scope.instructions[mnemonic].exec;
	    var ops = operand.match($scope.formats[format].string);
	    console.log(format, execf, ops);
	    var data = {"r":parseInt(ops[1]),"s":parseInt(ops[2]),"i":parseInt(ops[3])};
	    return new $scope.instruction(inst, mnemonic, data, execf);
	}
	else{
	    $scope.raise_error("Bad instruction: "+inst);
	}
	return null;
    }
    $scope.is_updated = function(x){
	for(var i = 0; i < $scope.updated.length; i++){
	    if($scope.updated[i] == x) return true;
	}
	return false;
    }
    $scope.formats = {
	"4r8i":{"string":/ *r([0-9]+), *()([0-9]+) */,"binary":"CCCCIIIIRRRRIIII","validator":function(c, r, s, i){return 16 <= r && r < 32 && 0 <= i && i < 256;}},
	"5r5s":{"string":/ *r([0-9]+), *r([0-9]+)() */,"binary":"CCCCCCSRRRRRSSSS","validator":function(c, r, s, i){return 0 <= r && r < 32 && 0 <= s && s < 32;}},
	"5r":{"string":/ *r([0-9]+)()() */,"binary":"CCCCCCCRRRRRCCCC","validator":function(c, r, s, i){return 0 <= r && r < 32;}},
	"5rZ":{"string":/ *r([0-9]+)()(), *Z */,"binary":"CCCCCCCRRRRRCCCC","validator":function(c, r, s, i){return 0 <= r && r < 32;}},
	"Z5r":{"string":/ *Z, *r([0-9]+)()() */,"binary":"CCCCCCCRRRRRCCCC","validator":function(c, r, s, i){return 0 <= r && r < 32;}},
	"12i":{"string":/ *()()([0-9]+) */,"binary":"CCCCIIIIIIIIIIII","validator":function(c, r, s, i){return 0 <= i && i < 4096;}},
	"7i":{"string":/ *()()([0-9]+) */,"binary":"CCCCCCIIIIIIICCC","validator":function(c, r, s, i){return 0 <= i && i < 128;}},
	"n":{"string":/ *()()() */,"binary":"CCCCCCCCCCCCCCCC","validator":function(c, r, s, i){return true;}}
    }
    $scope.encode = function(format, c, r, s, i){
	var fmt = $scope.formats[format].binary;
	var inst = 0;
	for(var j = 0; j < 16; j++) {
	    if(fmt[j] == "C"){
		inst += (c%2)<<j;
		c >>= 1;
	    }
	    if(fmt[j] == "R"){
		inst += (r%2)<<j;
		r >>= 1;
	    }
	    if(fmt[j] == "S"){
		inst += (s%2)<<j;
		s >>= 1;
	    }
	    if(fmt[j] == "I"){
		inst += (i%2)<<j;
		i >>= 1;
	    }
	}
	return inst;
    }
    $scope.decode = function(fmt, x){
	var inst = {"c":0,"r":0,"s":0,"i":0};
	for(var i = 15; i >= 0; i--) {
	    var b = (x>>i)&1;
	    if(fmt[i] == "C"){
		inst.c = 2*(inst.c) + b;
	    }
	    if(fmt[i] == "R"){
		inst.r = 2*(inst.r) + b;
	    }
	    if(fmt[i] == "S"){
		inst.s = 2*(inst.s) + b;
	    }
	    if(fmt[i] == "I"){
		inst.i = 2*(inst.i) + b;
	    }
	}
	return inst;
    }
    $scope.label = function(name, addr){
	this.label = true;
	this.name = name;
	this.addr = addr;
    }
    $scope.instruction = function(text, mnemonic, data, exec){
	thislabel = false;
	this.text = text;
	this.c = data.c;
	this.r = data.r;
	this.s = data.s;
	this.i = data.i;
	this.mnemonic = mnemonic;
	console.log(this.text, this.c, this.r, this.s, this.i, this.mnemonic);
	this.format = $scope.instructions[this.mnemonic].format;
	this.encoding = $scope.encode(this.format, this.c, this.r, this.s, this.i);
	this.display = function(){
	    if($scope.PC_display_mode == "t"){
		return this.text;
	    }
	    else if($scope.PC_display_mode == "d"){
		return this.encoding;
	    }
	    else if($scope.PC_display_mode == "h"){
		var s = this.encoding.toString(16);
		return "0x"+smul("0",4 - s.length)+s;
	    }
	    else if($scope.PC_display_mode == "b"){
		var s = this.encoding.toString(2);
		return smul("0",16 - s.length) + s;
	    }
	}
	this.run = function(){
	    if($scope.formats[this.format].validator(this.c, this.r, this.s, this.i)){
		exec(this.c, this.r, this.s, this.i);
	    }
	    else{
		$scope.raise_error("Illegal instruction: "+text);
	    }
	}
    }
    function smul(str, num) {
	var acc = [];
	for (var i = 0; (1 << i) <= num; i++) {
	    if ((1 << i) & num)
		acc.push(str);
	    str += str;
	}
	return acc.join("");
    }
    $scope.step = function(){
	var i = $scope.PM[$scope.PC];
	console.log("i",i);
	i.run();
    }
    $scope.run_inst = function(){
	var i = $scope.parse($scope.current_inst);
	$scope.PM[$scope.PC] = i;
	console.log("i",i);
	i.run();
    }
    $scope.raise_error = function(s){
	alert(s);
    }
    $scope.instructions = {
	"ldi":{"format":"4r8i", "c": 14, "exec":function(c, r, s, i){
	    $scope.RF[r] = i;
	    $scope.PC++;
	    $scope.updated = [r,"PC"];}},
	"mov":{"format":"5r5s", "c": 11, "exec":function(c, r, s, i){
	    $scope.RF[r] = $scope.RF[s];
	    $scope.PC++;
	    $scope.updated = [r,"PC"];}},
	"add":{"format":"5r5s", "c": 3, "exec":function(c, r, s, i){
	    $scope.RF[r] = ($scope.RF[r] + $scope.RF[s])%256;
	    $scope.PC++;
	    if($scope.RF[r] == 0)
		$scope.Z = 1;
	    else
		$scope.Z = 0;
	    $scope.updated = [r, "PC", "Z", "C", "O"];}},
	"sub":{"format":"5r5s", "c": 3, "exec":function(c, r, s, i){
	    $scope.RF[r] = ($scope.RF[r] - $scope.RF[s] + 256)%256;
	    $scope.PC++;
	    if($scope.RF[r] == 0)
		$scope.Z = 1;
	    else
		$scope.Z = 0;
	    $scope.updated = [r, "PC", "Z", "C", "O"];}},
	"cp":{"format":"5r5s", "c": 3, "exec":function(c, r, s, i){
	    $scope.PC++;
	    if($scope.RF[r] == $scope.RF[s])
		$scope.Z = 1;
	    else
		$scope.Z = 0;
	    $scope.updated = ["PC", "Z", "C", "O"];}},
	"cpi":{"format":"4r8i", "c": 14, "exec":function(c, r, s, i){
	    if($scope.RF[r] == i) $scope.Z = 1;
	    else $scope.Z = 0;
	    $scope.PC++;
	    $scope.updated = ["PC","Z","C","O"];}},
	"dec":{"format":"5r", "c": 1187, "exec":function(c, r, s, i){
	    $scope.RF[r] = ($scope.RF[r] + 255)%256;
	    $scope.PC++;
	    $scope.updated = [r,"PC"];}},
	"inc":{"format":"5r", "c": 1187, "exec":function(c, r, s, i){
	    $scope.RF[r] = ($scope.RF[r] + 1)%256;
	    $scope.PC++;
	    $scope.updated = [r,"PC"];}},
	"ld":{"format":"5rZ", "c": 1187, "exec":function(c, r, s, i){
	    var Z = $scope.RF[30]+256*$scope.RF[31];
	    $scope.RF[r] = $scope.RAM[Z];
	    $scope.PC++;
	    $scope.updated = [r,"PC"];}},
	"st":{"format":"Z5r", "c": 1187, "exec":function(c, r, s, i){
	    var Z = $scope.RF[30]+256*$scope.RF[31];
	    $scope.RAM[Z] = $scope.RF[r];
	    $scope.PC++;
	    $scope.updated = ["["+Z+"]","PC"];}},
	"rjmp":{"format":"12i", "c": 12, "exec":function(c, r, s, i){
	    $scope.PC = ($scope.PC + i)%65536;
	    $scope.updated = ["PC"];}},
	"breq":{"format":"7i", "c": 12, "exec":function(c, r, s, i){
	    $scope.PC = ($scope.PC + ($scope.Z == 1 ? (i <= 64 ? i : i-128) : 1))%65536;
	    $scope.updated = ["PC"];}},
	"nop":{"format":"n", "c": 0, "exec":function(c, r, s, i){
	    $scope.PC++;
	    $scope.updated = ["PC"];}},
	"halt":{"format":"n", "c": 0, "exec":function(c, r, s, i){
	    $scope.reset(false);}}
    };
    $scope.reset(true);
    setTimeout($scope.cm_setup, 50);
})
    .directive('simAvr',function(){
	return {
	    restrict: 'E',
	    scope:{
		program: '=program',
		control: '=',
		size: '@size',
		lightboard_feature: '@lightboard',
		reset_feature: '@reset',
		quest_feature: '@quest',
		simid: '@simid'
	    },
	    templateUrl: function(element,attrs){
		return attrs.template;
	    },
	    controller: 'AvrSimController',
	    link: function(scope,element,attrs){
		if(scope.control){
		    scope.control.set_program = function(new_prog){
			scope.change_program(new_prog);
		    }
		    scope.control.get_program = function(){
			return scope.program;
		    }
		}
	    }
	}
    });

