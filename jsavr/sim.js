var app = app || angular.module('app', []);

app.controller("AvrSimController", function($scope){
    $scope.do_nothing = function(a){}
    $scope.debug_log = $scope.do_nothing;
    $scope.status = "Ready";
    $scope.running = false;
    $scope.outputs = [];
    $scope.io_state = {'switch_state':["OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"]};
    $scope.steps = {'count':1};
    $scope.output_type = {"selection":"program"};
    $scope.cm_setup = function(){
	var sim_textarea = document.getElementById("simavr"+$scope.simid+"_program_area");
	$scope.debug_log($scope.simid,sim_textarea);
	if(sim_textarea == null) return;
	$scope.editor = CodeMirror.fromTextArea(sim_textarea, {
	    lineNumbers: true,
	    gutters: ["breakpoints", "CodeMirror-linenumbers"]
	});
	if($scope.size){
	    if($scope.size == "auto"){
		$scope.editor.setSize(null, ($scope.program.split("\n").length + 2)*($scope.editor.defaultTextHeight()) + 10);
	    }
	    else{
		$scope.editor.setSize(null, $scope.size);
	    }
	}
	else{
	    $scope.editor.setSize(null, "70%");
	}
	$scope.editor.setOption("extraKeys", {
            'Ctrl-Enter': function(cm) {
                $scope.program_pm();
                $scope.$apply();
            }
	});
	$scope.editor.setValue($scope.program);
    }
    $scope.symbols = {};
    $scope.PM_display_mode = "t";
    $scope.RAM_display_mode = "d";
    $scope.RF_display_mode = "d";
    $scope.RAM = [];
    $scope.PM = [];
    $scope.RF = [];
    
    $scope.PIND = 0;
    $scope.PORTD = 0;
    $scope.DDRD = 0;
    $scope.SPH = 0;
    $scope.SPL = 0;
    
    $scope.RAM_size = 65536;
    $scope.PM_size = 65536;
    $scope.RF_size = 32;
    $scope.updated = [];
    $scope.error_line = 0;
    $scope.current_ram_data = [];
    $scope.reset_program = function(){
	if($scope.running) return;
	if($scope.text){
	    $scope.debug_log("Using text");
	    $scope.program = $scope.text;
	}
	else if($scope.original_program){
	    $scope.program = $scope.original_program;
	}
	$scope.change_program($scope.program);
    }
    
    $scope.reset = function(pm_reset){
	$scope.io_state.switch_state = ["OFF","OFF","OFF","OFF","OFF","OFF","OFF","OFF"];
	$scope.output_type.selection = "program";
	$scope.display_pm_start = 0;
	$scope.display_ram_start = 0;
	$scope.steps = {'count':1};
	$scope.PC = 0;
	$scope.Z = 0;
	$scope.C = 0;
	$scope.N = 0;
	$scope.PIND = 0;
	$scope.PORTD = 0;
	$scope.DDRD = 0;
	$scope.SPH = 0;
	$scope.SPL = 0;
	$scope.updated = [];
	$scope.ram_updated = [];
	$scope.outputs = [];
	$scope.mux = new $scope.output_mux();
	for(var i = 0; i < $scope.RF_size; i++) $scope.RF[i] = 0;
	for(var i = 0; i < $scope.RAM_size; i++) $scope.RAM[i] = 0;
	for(var i = 0; i < $scope.IORF_size; i++) $scope.IORF[i] = 0;
	var nop = $scope.parse("nop",0);
	if(pm_reset){ for(var i = 0; i < $scope.PM_size; i++){ nop.addr = i; $scope.PM[i] = nop; }}
	if(!pm_reset){ for(var i = 0; i < $scope.current_ram_data.length; i++) $scope.RAM[i+1024] = $scope.current_ram_data[i]; }
	if($scope.editor) $scope.editor.removeLineClass($scope.error_line, "background", "active_line");
    }
    $scope.display_pm_start = 0;
    $scope.display_ram_start = 0;
    $scope.display_pm_length = 16;
    $scope.display_ram_length = 16;
    
    $scope.change_program = function(prog){
	$scope.program = prog;
	if($scope.editor) $scope.editor.setValue(prog);
    }
    $scope.display_ram = function(i){
	if($scope.RAM_display_mode == "d"){
	    return $scope.RAM[i];
	}
	else if($scope.RAM_display_mode == "2"){
	    return $scope.truncate($scope.RAM[i],8,true);
	}
	else if($scope.RAM_display_mode == "c"){
	    return String.fromCharCode($scope.RAM[i])
	}
    }
    $scope.display_rf = function(i){
	if($scope.RF_display_mode == "d"){
	    return $scope.truncate($scope.RF[i],8,false);
	}
	if($scope.RF_display_mode == "2"){
	    return $scope.truncate($scope.RF[i],8,true);
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
	if($scope.running) return;
	$scope.reset(true);
	$scope.running = true;
	$scope.program = $scope.editor.getValue();
	var pm_data = $scope.preparse($scope.program);
	if(!pm_data){
	    $scope.running = false;
	    return;
	}
	var pm_addr = 0;
	for(var i = 0; i < pm_data.length; i++){
	    var datum = pm_data[i];
	    if(datum.inst){
		var inst = $scope.parse(datum.inst,pm_addr);
		if(!inst) continue;
		if(inst.error){
		    $scope.error_on_line(datum.line, inst.error);
		    return;
		}
		$scope.PM[pm_addr] = inst;
		pm_addr++;
	    }
	    else if(datum.word){
		var inst = $scope.decode(datum.word,pm_addr);
		if(inst.error){
		    $scope.error_on_line(datum.line, inst.error);
		    return;
		}
		$scope.PM[pm_addr] = inst;
		pm_addr++;
	    }
	}
	$scope.status = "Ready";
    }
    $scope.error_on_line = function(linenum, err_msg){
	$scope.running = false;
	$scope.status = "Error on line " + linenum + ": " + err_msg;
	$scope.error_line = linenum;
	if($scope.editor) $scope.editor.addLineClass(linenum, "background", "active_line");
    }
    $scope.preparse = function(){
	var lines = $scope.program.split("\n");
	var to_program = [];
	var pm_offset = 0;
	var ram_offset = 1024;
	for(var i = 0; i < lines.length; i++){
	    console.log("LL",lines[i])
	    var pieces = lines[i].match(/^((?:[^";]|';'|"(?:[^\\"]+|\\(?:\\\\)*[nt\\"])*")*)(;.*)?$/)
	    $scope.debug_log("P",pieces);
	    if(!pieces){
		$scope.error_on_line(i, "Invalid line: "+i);
		return;
	    }
	    if(!pieces[1]) continue;
	    lines[i] = pieces[1].trim();
	    var is_inst = true;
	    for(var d in $scope.directives){
		var matches = lines[i].match($scope.directives[d].regex)
		$scope.debug_log("D",lines[i],d,matches);
		if(matches){
		    // process needs to return:
		    // - What it inserts to PM (pm_data)
		    // - What it inserts into RAM (ram_data)
		    // - What symbol it wants to make (symbol)
		    // - What kind of symbol it is (symbol_type == "pm" | "ram")
		    // - Whether there was an error (error)
		    
		    var result = $scope.directives[d].process(matches);

		    // Handle error
		    if(result.error){
			$scope.error_on_line(i, result.error);
			return;
		    }

		    // Update symbol
		    if(result.symbol && result.symbol_type){
			if(result.symbol_type == "pm"){
			    $scope.symbols[result.symbol] = pm_offset;
			}
			else if(result.symbol_type == "ram"){
			    $scope.symbols[result.symbol] = ram_offset;
			}
		    }
		    
		    // Insert data and update offsets
		    if(result.pm_data){
			for(var j = 0; j < result.pm_data.length; j++){
			    to_program.push({'word':result.pm_data[j],'line':i});
			}
			pm_offset += result.pm_data.length;
		    }
		    if(result.ram_data){
			for(var j = 0; j < result.ram_data.length; j++){
			    $scope.RAM[ram_offset + j] = result.ram_data[j];
			}
			$scope.current_ram_data = $scope.current_ram_data.concat(result.ram_data);
			ram_offset += result.ram_data.length;
		    }
		    is_inst = false;
		    break;
		}
	    }
	    if(is_inst && !(/^[ \t]*$/.test(lines[i]))){
		to_program.push({'inst':lines[i],'line':i});
		pm_offset++;
	    }
	}
	return to_program;
    }
    $scope.parse = function(inst,addr){
	$scope.debug_log(inst)
	var matches = inst.match(/^[ \t]*([a-zA-Z]+)[ \t]*((?:[^;]|';')*)[ \t]*$/)
	if(!matches){
	    return {"error":"Line does not match any directive or instruction"};
	}
	var mnemonic = matches[1];
	var operand = matches[2];
	$scope.debug_log(mnemonic, "|||", operand);
	if(mnemonic in $scope.instructions){
	    var format = $scope.instructions[mnemonic].format;
	    var execf = $scope.instructions[mnemonic].exec;
	    var ops = operand.match($scope.formats[format].string);
	    if(!ops){
		return {"error":"Operands to instruction " + inst + " did not parse"};
	    }
	    for(var i = 0; i < 3; i++){
		if(/^[0-9]+$/.test(ops[i])) ops[i] = parseInt(ops[i]);
		//else if(format.sym_valid[i]) ops[i] = symbols[ops[i]];
	    }
	    var opcode = $scope.instructions[mnemonic].c;
	    $scope.debug_log(format, execf, ops, opcode);
	    var data = {"r":ops[1],"s":ops[2],"i":ops[3],"c":opcode};
	    var new_inst = new $scope.instruction(mnemonic + " " + operand, mnemonic, data, execf,addr);
	    if(new_inst.error){
		return {"error":inst.error};
	    }
	    if(new_inst.check_valid()){
		return new_inst;
	    }
	    else{
		return {"error":"Illegal operands to instruction " + inst};
	    }
	}
	else{
	    return {"error":"Invalid instruction " + inst};
	}
	return null;
    }
    $scope.is_updated = function(x){
	for(var i = 0; i < $scope.updated.length; i++){
	    if($scope.updated[i] == x) return true;
	}
	return false;
    }
    $scope.is_ram_updated = function(x){
	for(var i = 0; i < $scope.updated.length; i++){
	    if($scope.ram_updated[i] == x) return true;
	}
	return false;
    }
    $scope.handle_string_escapes = function(s){
	s = s.replace(/(([^\\]|)(\\\\)*)\\n/g,"$1\n");
	s = s.replace(/(([^\\]|)(\\\\)*)\\"/g,"$1\"");
	s = s.replace(/\\\\/g,"\\");
	return s;
    }
    $scope.directives = {
	"label":{"regex":/^([a-zA-Z_][a-zA-Z0-9_]*):$/,"process":function(args){
	    return {"symbol":args[1],
		    "symbol_type":"pm",
		   };
	}},
	"word":{"regex":/^\.word ([0-9,]+)$/,"process":function(args){
	    var rdata = args[1].split(",");
	    for(var i = 0; i < rdata.length; i++){
		rdata[i] = $scope.truncate(parseInt(rdata[i]),16,false);
	    }
	    return {"symbol":args[1],
		    "symbol_type":"pm",
		    "pm_data":rdata
		   };
	}},
	"byte_ram":{"regex":/^ *\.byte\(([a-zA-Z_][a-zA-Z0-9_]*)\) ([-0-9,]+) *$/,"process":function(args){
	    var rdata = args[2].split(",");
	    for(var i = 0; i < rdata.length; i++){
		rdata[i] = $scope.truncate(parseInt(rdata[i]),8,false);
	    }
	    return {"symbol":args[1],
		    "symbol_type":"ram",
		    "ram_data":rdata
		   };
	}},
	"string_ram":{"regex":/^ *\.string\(([a-zA-Z_][a-zA-Z0-9_]*)\) "((?:[^"\\]|\\.)*)" *$/,"process":function(args){
	    var str = $scope.handle_string_escapes(args[2]);
	    console.log("SS",str);
	    var rdata = []
	    for(var i = 0; i < str.length; i++){
		rdata.push($scope.truncate(str.charCodeAt(i),8,false));
	    }
	    rdata.push(0);
	    return {"symbol":args[1],
		    "symbol_type":"ram",
		    "ram_data":rdata
		   };
	    
	}}
    };
    // X,*:  111
    // Y,"": 010
    // Y,+-" 110
    // Z,"": 000
    // Z,+-: 100
    // "":  00
    // "+": 01
    // "-": 10
    $scope.encode_x = function(i){
	var x = 0;
	var ptr = i[0] == "-" ? i[1] : i[0];
	var mod = i[0] == "-" ? "-" : (i[1] == "+" ? "+" : "");
	if(ptr == "X") x = 7*4
	if(ptr == "Y") x = 6*4
	if(ptr == "Z") x = 4*4
	if(ptr != "X" && mod == "") x -= 16;
	if(mod == "+") x += 1;
	if(mod == "-") x += 2;
	return x;
    }
    $scope.decode_x = function(x){
	var ptr = "";
	var mod = "";
	$scope.debug_log("XX",x,x&3,(x>>2)&3)
	if(((x >> 2)&3) == 3) ptr = "X";
	if(((x >> 2)&3) == 2) ptr = "Y";
	if(((x >> 2)&3) == 0) ptr = "Z";
	if((x&3) == 1) mod = "+";
	if((x&3) == 2) mod = "-";
	$scope.debug_log("X=",mod,ptr)
	return mod == "-" ? mod +""+ ptr : ptr +""+ mod;
    }
    $scope.formats = {
	"4r8i":{
	    "string":/ *r([0-9]+), *()(-?[a-zA-Z_0-9)(-]+|'..?') *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " r" + r + ","+i;},
	    "binary":"CCCCIIIIRRRRIIII",
	    "i_bits":8,
	    "validator":function(c, r, s, i){return 16 <= r && r < 32 && -128 <= i && i < 256;}},
	"5r5s":{
	    "string":/ *r([0-9]+), *r([0-9]+)() *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " r" + r + ",r"+s;},
	    "binary":"CCCCCCSRRRRRSSSS",
	    "validator":function(c, r, s, i){return 0 <= r && r < 32 && 0 <= s && s < 32;}},
	"6s5r":{
	    "string":/ *r([0-9]+), *([0-9]+)() *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " r" + r + ","+s;},
	    "binary":"CCCCCSSRRRRRSSSS",
	    "validator":function(c, r, s, i){return 0 <= r && r < 32 && 0 <= s && s < 64;}},
	"5r6s":{
	    "string":/ *([0-9]+), *r([0-9]+)() *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " " + r + ",r"+s;},
	    "binary":"CCCCCSSRRRRRSSSS",
	    "validator":function(c, r, s, i){return 0 <= r && r < 64 && 0 <= s && s < 32;}},
	"5r":{
	    "string":/ *r([0-9]+)()() *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " r" + r;},
	    "binary":"CCCCCCCRRRRRCCCC",
	    "validator":function(c, r, s, i){return 0 <= r && r < 32;}},
	"5rX":{
	    "string":/ *r([0-9]+)(), *(-[XYZ]|[XYZ]|[XYZ]\+) *$/,
	    "to_string":function(mnemonic,c,r,s,i,x){return mnemonic + " r" + r + ","+i},
	    "binary":"CCCXCCCRRRRRXXXX",
	    "validator":function(c, r, s, i){return 0 <= r && r < 32;}},
	"X5r":{
	    "string":/ *(-[XYZ]|[XYZ]|[XYZ]\+), *r([0-9]+)() *$/,
	    "to_string":function(mnemonic,c,r,s,i,x){return mnemonic + " " + r + ",r"+s;},
	    "binary":"CCCXCCCRRRRRXXXX",
	    "validator":function(c, r, s, i){return 0 <= s && s < 32;}},
	"12i":{
	    "string":/ *()()(-?[a-zA-Z_0-9)(]+) *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " " + i;},
	    "binary":"CCCCIIIIIIIIIIII",
	    "i_bits":12,
	    "validator":function(c, r, s, i){return -2048 <= i && i < 2048;}},
	"7i":{
	    "string":/ *()()(-?[a-zA-Z_0-9)(]+) *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic + " " + i;},
	    "binary":"CCCCCCIIIIIIICCC",
	    "i_bits":7,
	    "validator":function(c, r, s, i){return -64 <= i && i < 64;}},
	"n":{
	    "string":/ *()()() *$/,
	    "to_string":function(mnemonic,c,r,s,i){return mnemonic;},
	    "binary":"CCCCCCCCCCCCCCCC",
	    "validator":function(c, r, s, i){return true;}}
    }
    $scope.encode = function(format, c, r, s, i){
	var fmt = $scope.formats[format].binary;
	var inst = 0;
	var x = 0;
	if(format == "5r6s"){
	    i = s;
	    s = r;
	    r = i;
	}
	else if(format == "5rX" || format == "X5r"){
	    if(format == "X5r"){
		i = r;
		r = s;
	    }
	    $scope.debug_log("Xe",i);
	    x = $scope.encode_x(i);
	    $scope.debug_log("Xd",x);
	}
	for(var j = 15; j >= 0; j--) {
	    if(fmt[j] == "C"){
		inst += (c%2)<<(15-j);
		c >>= 1;
	    }
	    if(fmt[j] == "R"){
		inst += (r%2)<<(15-j);
		r >>= 1;
	    }
	    if(fmt[j] == "S"){
		inst += (s%2)<<(15-j);
		s >>= 1;
	    }
	    if(fmt[j] == "I"){
		inst += (i%2)<<(15-j);
		i >>= 1;
	    }
	    if(fmt[j] == "X"){
		inst += (x%2)<<(15-j);
		x >>= 1;
	    }
	}
	return inst;
    }
    $scope.decode = function(x,addr){
	for(var f in $scope.formats){
	    fmt = $scope.formats[f];
	    var data = {"c":0,"r":0,"s":0,"i":0,"x":0}
	    for(var j = 15; j >= 0; j--){
		//$scope.debug_log("J",j,fmt.binary[15-j],(x>>j)%2);
		if(fmt.binary[15-j] == "C") data.c = (data.c * 2) + ((x >> j) % 2);
		if(fmt.binary[15-j] == "R") data.r = (data.r * 2) + ((x >> j) % 2);
		if(fmt.binary[15-j] == "S") data.s = (data.s * 2) + ((x >> j) % 2);
		if(fmt.binary[15-j] == "I") data.i = (data.i * 2) + ((x >> j) % 2);
		if(fmt.binary[15-j] == "X") data.x = (data.x * 2) + ((x >> j) % 2);
	    }
	    if(f == "4r8i") data.r += 16;
	    if(f == "12i") data.i = $scope.truncate(data.i,12,true);
	    if(f == "7i") data.i = $scope.truncate(data.i,7,true);
	    if(f == "5rX") data.i = $scope.decode_x(data.x);
	    if(f == "X5r") data.r = $scope.decode_x(data.x);
	    for(var mnemonic in $scope.instructions){
		inst = $scope.instructions[mnemonic];
		if(inst.format == f && inst.c == data.c){
		    return new $scope.instruction(x,mnemonic,data,inst.exec,addr);
		}
	    }
	}
	return {"error":"Could not decode instruction: " + x};
    }
    $scope.label = function(name, addr){
	this.label = true;
	this.name = name;
	this.addr = addr;
    }
    $scope.output_mux = function(){
	this.SEL_ADDR = 0;
	this.SEL_LEN = 255;
	this.LCD_OUT = 1;
	this.LB_OUT = 2;
	this.target = 0;
	this.len = 0;
	this.state = 0;
	this.input = function(val){
	    if(this.state == this.SEL_ADDR) {
		this.target = val;
		this.state = this.SEL_LEN;
	    }
	    else if(this.state == this.SEL_LEN){
		this.len = val;
		this.state = this.target;
		this.target = 0;
	    }
	    else if(this.len > 0){
		if(this.state-1 < $scope.output_devs.length)
		    $scope.output_devs.input(val);
		this.len--;
	    }
	    else{
		this.state = this.SEL_ADDR;
	    }
	}
    }
    $scope.lcd = function(){
	this.input = function(val){
	    
	}
    }
    $scope.set_PM_display_mode = function(m){
	$scope.PM_display_mode = m;
    }
    $scope.set_RAM_display_mode = function(m){
	$scope.RAM_display_mode = m;
    }
    $scope.set_RF_display_mode = function(m){
	$scope.RF_display_mode = m;
    }
    $scope.instruction = function(text, mnemonic, data, exec, addr){
	thislabel = false;
	this.addr = addr;
	this.text = text;
	this.c = data.c;
	this.r = data.r;
	this.s = data.s;
	this.i = data.i;
	this.exec = exec;
	this.mnemonic = mnemonic;
	$scope.debug_log(this.text, this.c, this.r, this.s, this.i, this.mnemonic);
	this.format = $scope.instructions[this.mnemonic].format;
	if(this.i.match){
	    matches = this.i.match(/(lo|hi)8\(([a-zA-Z_][a-zA-Z0-9_]*)\)/);
	    if(matches){
		if(matches[2] in $scope.symbols){
		    if(matches[1] == "lo") this.i = $scope.truncate($scope.symbols[matches[2]],8,false);
		    if(matches[1] == "hi") this.i = $scope.truncate($scope.symbols[matches[2]]>>8,8,false);
		}
		else{
		    this.error = "Symbol not found " + matches[2];
		}
	    }
	    else if(this.i in $scope.symbols){
		this.i = $scope.symbols[this.i];
		var fmt = $scope.formats[this.format];
		$scope.debug_log($scope.symbols,fmt.i_bits);
		if(fmt.i_bits){
		    this.i = $scope.truncate(this.i - this.addr - 1,fmt.i_bits,true);
		}
	    }
	    else if(/'[^'\\]'/.test(this.i)){
		this.i = this.i.charCodeAt(1);
	    }
	    else if(this.i == "'\\''"){
		this.i = this.i.charCodeAt(2);
	    }
	    else if(this.i == "'\\\\'"){
		this.i = this.i.charCodeAt(2);
	    }
	    else if(this.i == "'\\n'"){
		this.i = 10;
	    }
	    else if(this.i == "'\\t'"){
		this.i = 9;
	    }
	    else if(/^[XYZ]$|^[XYZ]\+$|^-[XYZ]$/.test(this.i)){
		this.i = this.i;
	    }
	    else this.i = parseInt(this.i);
	}
	this.encoding = $scope.encode(this.format, this.c, this.r, this.s, this.i < 0 ? $scope.truncate(this.i,$scope.formats[this.format].i_bits,false) : this.i);
	$scope.debug_log(this.text, this.c, this.r, this.s, this.i, this.mnemonic);
	var self = this;
	this.display = function(){
	    if($scope.PM_display_mode == "t"){
		return $scope.formats[self.format].to_string(self.mnemonic,self.c,self.r,self.s,self.i);
	    }
	    else if($scope.PM_display_mode == "d"){
		return self.encoding;
	    }
	    else if($scope.PM_display_mode == "h"){
		var s = self.encoding.toString(16);
		return "0x"+smul("0",4 - s.length)+s;
	    }
	    else if($scope.PM_display_mode == "b"){
		var s = self.encoding.toString(2);
		return smul("0",16 - s.length) + s;
	    }
	}
	this.check_valid = function(){
	    return $scope.formats[self.format].validator(self.c, self.r, self.s, self.i);
	}
	this.run = function(){
	    self.exec(self.c, self.r, self.s, self.i);
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
	if(!$scope.running) return;
	$scope.debug_log($scope.steps.count);
	for(var k = 0; k < $scope.steps.count; k++){
	    var i = $scope.PM[$scope.PC];
	    $scope.debug_log("i",i);
	    i.run();
	    if($scope.PC < $scope.display_pm_start || $scope.PC >= $scope.display_pm_start + $scope.display_pm_length){
		$scope.display_pm_start = Math.max(0, $scope.PC - $scope.display_ram_length/2);
	    }
	    if($scope.ram_updated.length > 0){
		$scope.display_ram_start = Math.max(0, Math.min.apply(Math, $scope.ram_updated) - $scope.display_ram_length/2);
	    }
	}
    }
    $scope.raise_error = function(s){
	$scope.status = "Error: " + s;
    }
    $scope.truncate = function(num, bits, twos_complement){
	var mod = 1<<bits;
	num = ((num % mod)+mod)%mod;
	return twos_complement ? (num >= 1<<(bits - 1) ? num - (1<<bits) : num) : num;
    }
    $scope.update_sreg = function(result, z, c, n){
	$scope.debug_log("SREG for",result);
	if(z) $scope.Z = $scope.truncate(result,8,false) == 0 ? 1 : 0;
	if(c) $scope.C = result >= 256 || result < 0 ? 1 : 0;
	if(n) $scope.N = $scope.truncate(result,8,true) <0 ? 1 : 0;
    }
    $scope.read_IO = function(s){
	if(s == 16) return $scope.PIND & (~($scope.DDRD));
	else if(s == 17) return $scope.DDRD;
	else if(s == 61) return $scope.SPL;
	else if(s == 62) return $scope.SPH;
	return 0;
    }
    $scope.write_IO = function(s,val){
	if(s == 18){
	    $scope.PORTD = $scope.DDRD & val;
	    $scope.output();
	}
	else if(s == 17) $scope.DDRD = $scope.truncate(val,8,false);
	else if(s == 61) $scope.SPL = $scope.truncate(val,8,false);
	else if(s == 62) $scope.SPH = $scope.truncate(val,8,false);
	if($scope.output_type.selection == "simple"){
	    console.log("simple");
	    $scope.PIND = 0;
	    for(var i = 0; i < 8; i++)
		$scope.PIND |= ($scope.io_state.switch_state[i] == "ON" ? 1 << i : 0)
	    $scope.PIND &= ~$scope.DDRD;
	}
    }
    $scope.inc_ptr = function(reg){
	if($scope.RF[reg] == -1 || $scope.RF[reg] == 255){
	    $scope.RF[reg] = 0
	    $scope.RF[reg+1] = $scope.truncate($scope.RF[reg+1]+1,8,false);
	}
	else $scope.RF[reg]++;
	if($scope.RF[reg] == 128){
	    $scope.RF[reg] = -128;
	}
    }
    $scope.dec_ptr = function(reg){
	$scope.RF[reg]--;
	if($scope.RF[reg] == -1){
	    $scope.RF[reg+1] = $scope.truncate($scope.RF[reg+1]-1,8,false);
	}
	if($scope.RF[reg] < -128){
	    $scope.RF[reg] = 127;
	}
    }
    $scope.incSP = function(){
	$scope.SPL++;
	if($scope.SPL == 256){
	    $scope.SPL = 0;
	    $scope.SPH = $scope.truncate($scope.SPH+1,8,false);
	}
    }
    $scope.decSP = function(){
	$scope.SPL--;
	if($scope.SPL == -1){
	    $scope.SPL = 255;
	    $scope.SPH = $scope.truncate($scope.SPH-1,8,false);
	}
    }
    $scope.instructions = {
	"ldi":{"format":"4r8i", "c": 14, "exec":function(c, r, s, i){
	    $scope.RF[r] = i;
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"mov":{"format":"5r5s", "c": 11, "exec":function(c, r, s, i){
	    $scope.RF[r] = $scope.RF[s];
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"add":{"format":"5r5s", "c": 3, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] + $scope.RF[s], true, true, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] + $scope.RF[s],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"adc":{"format":"5r5s", "c": 7, "exec":function(c, r, s, i){
	    var oldC = $scope.C;
	    $scope.update_sreg($scope.RF[r] + $scope.RF[s] + oldC, true, true, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] + $scope.RF[s] + oldC,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"sbc":{"format":"5r5s", "c": 2, "exec":function(c, r, s, i){
	    var oldC = $scope.C;
	    $scope.update_sreg($scope.RF[r] - $scope.RF[s] - oldC, true, true, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] - $scope.RF[s] - oldC,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"sub":{"format":"5r5s", "c": 6, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] - $scope.RF[s], true, true, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] - $scope.RF[s],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"cp":{"format":"5r5s", "c": 5, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] - $scope.RF[s], true, true, true);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC", "Z", "C", "N"];}},
	"and":{"format":"5r5s", "c": 8, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] & $scope.RF[s], true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] & $scope.RF[s],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"or":{"format":"5r5s", "c": 10, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] | $scope.RF[s], true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] | $scope.RF[s],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"eor":{"format":"5r5s", "c": 9, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] ^ $scope.RF[s], true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] ^ $scope.RF[s],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r, "PC", "Z", "C", "N"];}},
	"cpi":{"format":"4r8i", "c": 3, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] - i, true, true, true);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","Z","C","N"];}},
	"subi":{"format":"4r8i", "c": 5, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] - i, true, true, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] - i,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","Z","C","N"];}},
	"andi":{"format":"4r8i", "c": 7, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] & i, true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] & i,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","Z","C","N"];}},
	"ori":{"format":"4r8i", "c": 6, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] | i, true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] | i,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","Z","C","N"];}},
	"dec":{"format":"5r", "c": 1194, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] - 1, true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] - 1,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"inc":{"format":"5r", "c": 1187, "exec":function(c, r, s, i){
	    $scope.update_sreg($scope.RF[r] + 1, true, false, true);
	    $scope.RF[r] = $scope.truncate($scope.RF[r] + 1,8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"neg":{"format":"5r", "c": 1185, "exec":function(c, r, s, i){
	    $scope.update_sreg(-$scope.RF[r], true, true, true);
	    $scope.RF[r] = $scope.truncate(-$scope.RF[r],8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"com":{"format":"5r", "c": 1184, "exec":function(c, r, s, i){
	    $scope.update_sreg(~($scope.RF[r]), true, false, true);
	    $scope.RF[r] = $scope.truncate(~($scope.RF[r]),8,false);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"ld":{"format":"5rX", "c": 32, "exec":function(c, r, s, i){
	    var reg = 0;
	    if(i == "X" || i == "-X" || i == "X+") reg = 26;
	    if(i == "Y" || i == "-Y" || i == "Y+") reg = 28;
	    if(i == "Z" || i == "-Z" || i == "Z+") reg = 30;
	    if(i[0] == "-"){
		$scope.updated.push(reg);
		$scope.dec_ptr(reg);
	    }
	    var ptr = $scope.truncate($scope.RF[reg],8,false)+256*$scope.truncate($scope.RF[reg+1],8,false);
	    $scope.updated = [r,"PC"];
	    $scope.RF[r] = $scope.RAM[ptr];
	    if(i[1] == "+"){
		$scope.updated.push(reg);
		$scope.inc_ptr(reg);
	    }
	    $scope.ram_updated = [];
	    $scope.PC++;}},
	"st":{"format":"X5r", "c": 33, "exec":function(c, r, s, i){
	    i = r;
	    r = s;
	    var reg = 0;
	    if(i == "X" || i == "-X" || i == "X+") reg = 26;
	    if(i == "Y" || i == "-Y" || i == "Y+") reg = 28;
	    if(i == "Z" || i == "-Z" || i == "Z+") reg = 30;
	    if(i[0] == "-"){
		$scope.updated.push(reg);
		$scope.dec_ptr(reg);
	    }
	    var ptr = $scope.truncate($scope.RF[reg],8,false)+256*$scope.truncate($scope.RF[reg+1],8,false);
	    $scope.updated = ["PC"];
	    $scope.ram_updated = [ptr];
	    $scope.RAM[ptr] = $scope.RF[r];
	    $scope.PC++;
	    if(i[1] == "+"){
		$scope.updated.push(reg);
		$scope.inc_ptr(reg);
	    }
	    }},
	"rjmp":{"format":"12i", "c": 12, "exec":function(c, r, s, i){
	    $scope.PC = $scope.truncate($scope.PC + i + 1,16,false);
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"breq":{"format":"7i", "c": 481, "exec":function(c, r, s, i){
	    $scope.PC = $scope.truncate($scope.PC + 1 + ($scope.Z == 1 ? (i <= 64 ? i : i-128) : 0),16,false);
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"brne":{"format":"7i", "c": 489, "exec":function(c, r, s, i){
	    $scope.PC = $scope.truncate($scope.PC + 1 + ($scope.Z == 0 ? (i <= 64 ? i : i-128) : 0),16,false);
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"brsh":{"format":"7i", "c": 488, "exec":function(c, r, s, i){
	    $scope.PC = $scope.truncate($scope.PC + 1 + ($scope.C == 0 ? (i <= 64 ? i : i-128) : 0),16,false);
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"brlo":{"format":"7i", "c": 480, "exec":function(c, r, s, i){
	    $scope.PC = $scope.truncate($scope.PC + 1 + ($scope.C == 1 ? (i <= 64 ? i : i-128) : 0),16,false);
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"in":{"format":"6s5r", "c": 22, "exec":function(c, r, s, i){
	    $scope.RF[r] = $scope.read_IO(s);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"out":{"format":"5r6s", "c": 23, "exec":function(c, r, s, i){
	    i = s;
	    s = r;
	    r = i;
	    $scope.write_IO(s,$scope.RF[r]);
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"asr":{"format":"5r", "c": 1189, "exec":function(c, r, s, i){
	    var C = $scope.RF[r]%2 == 0 ? 0 : 1;
	    $scope.RF[r] = $scope.truncate($scope.truncate($scope.RF[r],8,true) >> 1,8,false);
	    $scope.update_sreg($scope.RF[r], true, false, true);
	    $scope.C = C;
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = [r,"PC"];}},
	"push":{"format":"5r", "c": 1183, "exec":function(c, r, s, i){
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    $scope.RAM[SP] = $scope.RF[r];
	    $scope.decSP();
	    $scope.PC++;
	    $scope.updated = ["PC","SPH","SPL"];
	    $scope.ram_updated = [SP];}},
	"pop":{"format":"5r", "c": 1167, "exec":function(c, r, s, i){
	    $scope.incSP();
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    $scope.RF[r] = $scope.RAM[SP];
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","SPH","SPL"];}},
	"rcall":{"format":"12i", "c": 13, "exec":function(c, r, s, i){
	    $scope.PC++;
	    var PCL = $scope.PC % 256;
	    var PCH = Math.floor($scope.PC / 256);
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    $scope.RAM[SP] = PCH;
	    $scope.decSP();
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    $scope.RAM[SP] = PCL;
	    $scope.decSP();
	    $scope.PC = $scope.truncate($scope.PC + i,16,false);
	    $scope.updated = ["PC","SPH","SPL"];
	    $scope.ram_updated = [SP];}},
	"ret":{"format":"n", "c": 38152, "exec":function(c, r, s, i){
	    $scope.incSP();
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    var PCL = $scope.RAM[SP];
	    $scope.incSP();
	    var SP = $scope.SPH * 256 + $scope.SPL;
	    var PCH = $scope.RAM[SP];
	    $scope.PC = PCL + 256*PCH;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC","SPH","SPL"];}},
	"nop":{"format":"n", "c": 0, "exec":function(c, r, s, i){
	    $scope.PC++;
	    $scope.ram_updated = [];
	    $scope.updated = ["PC"];}},
	"halt":{"format":"n", "c": 1, "exec":function(c, r, s, i){
	    $scope.end();}}
    };
    $scope.io_switch = function(i){
	if($scope.io_state.switch_state[i] == "ON"){
	    $scope.io_state.switch_state[i] = "OFF";
	    $scope.PIND &= ~(1<<i);
	}
	else if($scope.io_state.switch_state[i] == "OFF"){
	    $scope.io_state.switch_state[i] = "ON";
	    $scope.PIND |= 1<<i;
	}
	$scope.PIND = $scope.PIND & ~$scope.DDRD;
    }
    $scope.output = function(){
	var out_val = $scope.PORTD;
	$scope.outputs.push(out_val);
	//$scope.outputs.push(String.fromCharCode(out_val));
    }
    $scope.initialize = function(){
	$scope.reset_program();
	$scope.cm_setup();
    }
    $scope.end = function(){
	if(!$scope.running) return;
	$scope.running = false;
	setTimeout($scope.cm_setup, 0);
    }
    $scope.reset(true);
    $scope.original_program = $scope.program;
    setTimeout($scope.initialize, 0);
})
    .directive('simAvr',function(){
	return {
	    restrict: 'E',
	    scope:{
		program: '=program',
		text:'=',
		control: '=',
		size: '@size',
		lightboard_feature: '@lightboard',
		reset_feature: '@reset',
		simid: '@simid',
		debug_mode_feature:'@debug'
	    },
	    templateUrl: function(element,attrs){
		return attrs.template;
	    },
	    controller: 'AvrSimController',
	    link: function(scope,element,attrs){
		scope.debug_log = scope.debug_mode_feature == 'yes' ? console.log.bind(console) : scope.do_nothing;
		if(scope.control){
		    scope.control.set_program = function(new_prog){
			scope.change_program(new_prog);
		    }
		    scope.control.get_program = function(){
			if(scope.editor) scope.program = scope.editor.getValue();
			return scope.program;
		    }
		    scope.control.get_PM = function(addr){
			return scope.PM[addr].encoding;
		    }
		    scope.control.get_RF = function(){
			return scope.RF;
		    }
		    scope.control.get_RAM = function(addr){
			return scope.RAM[addr];
		    }
		    scope.control.get_other = function(){
			return {
			    "PC":scope.PC,
			    "Z":scope.Z,
			    "C":scope.C,
			    "N":scope.N,
			    "DDRD":scope.DDRD,
			    "PIND":scope.PIND,
			    "PORTD":scope.PORTD,
			    "SPL":scope.SPL,
			    "SPH":scope.SPH
			}
		    }
		    if(scope.control.linked) scope.control.linked();
		    else scope.$emit("jsavr_linked");
		}
	    }
	}
    });

