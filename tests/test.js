"use strict"
var benv = require('benv');
var tests = require('./tests.js');
benv.setup(function(){
    benv.expose({angular:benv.require('../lib/angular/angular.js','angular')});
    var app = angular.module('app', [])
    require('../jsavr/sim.js');
    angular.bootstrap(document, ['app']);
    var $controller = angular.injector(['ng', 'app']).get('$controller');
    var scope = {};
    $controller('AvrSimController', { $scope: scope });
    scope.editor = {
	getValue:function(){return scope.program;},
	setValue:function(){return;},
	setOption:function(){return;},
	removeLineClass:function(){return;},
	clearGutter:function(){return;},
	setGutterMarker:function(){return;}
    }
    for(var mnemonic in tests.rstests){
	var ts = tests.rstests[mnemonic];
	for(var i = 0; i < ts.length; i++){
	    scope.program = "ldi r30,"+ts[i].ops[0]+"\nldi r31,"+ts[i].ops[1]+"\n"+mnemonic+" r30,r31";
	    scope.program_pm();
	    scope.PM_display_mode = "d";
	    var words = ".word " + scope.PM[2].display();
	    scope.step();
	    scope.step();
	    scope.step();
	    var results = {"res":[scope.RF[30] == ts[i].result,scope.RF[30],ts[i].result],
		       "n":[scope.N == ts[i].flags.n || ts[i].flags.n == "x",scope.N, ts[i].flags.n],
		       "z":[scope.Z == ts[i].flags.z || ts[i].flags.z == "x",scope.Z, ts[i].flags.z],
		       "c":[scope.C == ts[i].flags.c || ts[i].flags.c == "x",scope.C, ts[i].flags.c]};
	    scope.end();
	    scope.program = words;
	    scope.program_pm();
	    scope.PM_display_mode = "t";
	    results.enc = [scope.PM[0].display() == mnemonic + " r30,r31",scope.PM[0].display(), mnemonic + " r30,r31"];
	    var OK = true;
	    for(var j in results){
		if(!results[j][0]){
		    console.log("FAIL:",j);
		    console.log("ACTUAL:",results[j][1]);
		    console.log("EXPECTED:",results[j][2]);
		    OK = false;
		    break;
		}
	    }
	    if(OK) console.log(mnemonic + " " + i + ":   \tSUCCESS");
	    
	    scope.end();
	}
    }
    for(var mnemonic in tests.rtests){
	var ts = tests.rtests[mnemonic];
	for(var i = 0; i < ts.length; i++){
	    scope.program = "ldi r31,"+ts[i].op+"\n"+mnemonic+" r31";
	    scope.program_pm();
	    scope.PM_display_mode = "d";
	    var words = ".word " + scope.PM[1].display();
	    scope.step();
	    scope.step();
	    var results = {"res":[scope.RF[31] == ts[i].result,scope.RF[31],ts[i].result],
		       "n":[scope.N == ts[i].flags.n || ts[i].flags.n == "x",scope.N, ts[i].flags.n],
		       "z":[scope.Z == ts[i].flags.z || ts[i].flags.z == "x",scope.Z, ts[i].flags.z],
		       "c":[scope.C == ts[i].flags.c || ts[i].flags.c == "x",scope.C, ts[i].flags.c]};
	    scope.end();
	    scope.program = words;
	    scope.program_pm();
	    scope.PM_display_mode = "t";
	    results.enc = [scope.PM[0].display() == mnemonic + " r31",scope.PM[0].display(), mnemonic + " r31"];
	    var OK = true;
	    for(var j in results){
		if(!results[j][0]){
		    console.log(mnemonic + " " + i + ": FAIL",j)
		    console.log("ACTUAL:",results[j][1]);
		    console.log("EXPECTED:",results[j][2]);
		    OK = false;
		    break;
		}
	    }
	    if(OK) console.log(mnemonic + " " + i + ":    \tSUCCESS");
	    
	    scope.end();
	}
    }
    for(var mnemonic in tests.itests){
	var ts = tests.itests[mnemonic];
	for(var i = 0; i < ts.length; i++){
	    scope.program = "ldi r31,"+ts[i].ops[0]+"\n"+mnemonic+" r31,"+ts[i].ops[1];
	    scope.program_pm();
	    scope.PM_display_mode = "d";
	    var words = ".word " + scope.PM[1].display();
	    scope.step();
	    scope.step();
	    scope.step();
	    var results = {"res":[scope.RF[31] == ts[i].result,scope.RF[31],ts[i].result],
		       "n":[scope.N == ts[i].flags.n || ts[i].flags.n == "x",scope.N, ts[i].flags.n],
		       "z":[scope.Z == ts[i].flags.z || ts[i].flags.z == "x",scope.Z, ts[i].flags.z],
		       "c":[scope.C == ts[i].flags.c || ts[i].flags.c == "x",scope.C, ts[i].flags.c]};
	    scope.end();
	    scope.program = words;
	    scope.program_pm();
	    scope.PM_display_mode = "t";
	    results.enc = [scope.PM[0].display() == mnemonic+" r31,"+ts[i].ops[1],scope.PM[0].display(), mnemonic+" r31,"+ts[i].ops[1]];
	    var OK = true;
	    for(var j in results){
		if(!results[j][0]){
		    console.log("FAIL:",j);
		    console.log("ACTUAL:",results[j][1]);
		    console.log("EXPECTED:",results[j][2]);
		    OK = false;
		    break;
		}
	    }
	    if(OK) console.log(mnemonic + " " + i + ":    \tSUCCESS");
	    scope.end();
	}
    }
    for(var mnemonic in tests.otests){
	var ts = tests.otests[mnemonic];
	for(var i = 0; i < ts.length; i++){
	    scope.program = ts[i].program.join("\n");
	    scope.program_pm();
	    scope.PM_display_mode = "d";
	    var words = ".word ";
	    for(var j = 0; j < ts[i].program.length; j++){
		if(j > 0) words += ","
		words += scope.PM[j].display();
	    }
	    for(var j = 0; j < ts[i].program.length; j++){
		scope.step();
	    }
	    var fnOK = ts[i].verify(scope)
	    scope.end();
	    scope.program = words;
	    scope.program_pm();
	    scope.PM_display_mode = "t";
	    var encOK = true;
	    for(var j = 0; j < ts[i].program.length; j++){
		if(scope.PM[j].display() != ts[i].program[j]){
		    console.log("PROBLEM LINE: ",ts[i].program[j])
		    encOK = false;
		    break;
		}
	    }
	    scope.end();
	    console.log(mnemonic + " " + i + ": \t" + ((fnOK && encOK) ? "SUCCESS" : (fnOK + "," + encOK)));
	}
    }
    
    for(var mnemonic in tests.asmtests){
	var ts = tests.asmtests[mnemonic];
	for(var i = 0; i < ts.length; i++){
	    scope.program = ts[i].program.join("\n");
	    scope.program_pm();
	    scope.PM_display_mode = "d";
	    var words = ".word ";
	    for(var j = 0; j < ts[i].program.length; j++){
		if(j > 0) words += ","
		words += scope.PM[j].display();
	    }
	    for(var j = 0; j < ts[i].program.length; j++){
		scope.step();
	    }
	    var fnOK = ts[i].verify(scope)
	    scope.end();
	    console.log(mnemonic + " " + i + ": \t" + (fnOK ? "SUCCESS" : "FAIL"));
	}
    }

});

