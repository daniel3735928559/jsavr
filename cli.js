"use strict"
var benv = require('benv');
benv.setup(function(){
    benv.expose({angular:benv.require('./lib/angular/angular.js','angular')});
    var app = angular.module('app', [])
    require('./jsavr/sim.js');
    angular.bootstrap(document, ['app']);
    var $controller = angular.injector(['ng', 'app']).get('$controller');
    var scope = {};
    $controller('AvrSimController', { $scope: scope });
    scope.editor = {
	getValue:function(){return scope.program;},
	setOption:function(){return;},
	removeLineClass:function(){return;},
	clearGutter:function(){return;},
	setGutterMarker:function(){return;}
    }
    scope.program = 'ldi r31,9';
    scope.program_pm()
    scope.step()
    console.log(scope.RF);
});


