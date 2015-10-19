var asmtests = {
    "label":[
	{"program":["rjmp start","hello:","inc r31","ret","start:","ldi r31,5","rcall hello","rcall hello","rcall hello","nop","nop","nop","nop","nop","nop","nop","nop"],"verify":function(scope){
	    return scope.RF[31] == 8;
	}},
    ],
    "string":[
	{"program":[".string(hello) \"a\\\\;\\\"\\n\\t\"","ldi r31,hi8(hello)","ldi r30,lo8(hello)","ld r0,Z+","ld r1,Z+","ld r2,Z+","ld r3,Z+","ld r4,Z+","ld r5,Z+","ld r6,Z+"],"verify":function(scope){
	    return scope.RF[0] == "a".charCodeAt(0) && scope.RF[1] == "\\".charCodeAt(0) && scope.RF[2] == ";".charCodeAt(0) && scope.RF[3] == "\"".charCodeAt(0) && scope.RF[4] == "\n".charCodeAt(0) && scope.RF[5] == "\t".charCodeAt(0) && scope.RF[6] == 0;
	}}
    ],
    "byte":[
	{"program":[".byte(hello) 5,1,2,128,255","ldi r31,hi8(hello)","ldi r30,lo8(hello)","ld r0,Z+","ld r1,Z+","ld r2,Z+","ld r3,Z+","ld r4,Z+"],"verify":function(scope){
	    return scope.RF[0] == 5 && scope.RF[1] == 1 && scope.RF[2] == 2 && scope.RF[3] == 128 && scope.RF[4] == 255;
	}}
    ]
};

var otests = {
    "inout":[
	{"program":["ldi r31,255","out 17,r31","in r30,17"],"verify":function(scope){
	    return scope.RF[30] == 255 && scope.PIND == 0;
	}},
	{"program":["ldi r31,0","out 17,r31","ldi r31,255","out 18,r31"],"verify":function(scope){
	    return scope.PORTD == 0;
	}},
	{"program":["ldi r31,255","ldi r30,14","out 17,r31","out 18,r30"],"verify":function(scope){
	    return scope.PORTD == 14;
	}}
    ],
    "rjmp":[
	{"program":["ldi r31,15","inc r31","rjmp -2","nop","nop","nop","nop"],"verify":function(scope){
	    return scope.RF[31] == 18;
	}},
	{"program":["ldi r31,15","rjmp -1","ldi r31,16","nop","nop","nop"],"verify":function(scope){
	    return scope.RF[31] == 15;
	}},
	{"program":["ldi r31,15","ldi r30,14","rjmp 1","ldi r30,16","ldi r31,17"],"verify":function(scope){
	    return scope.RF[30] == 14 && scope.RF[31] == 17;
	}}
    ],
    "ldst":[
	{"program":["ldi r31,1","ldi r30,4","ldi r19,100","st Z,r19","ld r1,Z"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
	{"program":["ldi r29,1","ldi r28,4","ldi r19,100","st Y,r19","ld r1,Y"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
	{"program":["ldi r27,1","ldi r26,4","ldi r19,100","st X,r19","ld r1,X"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
	{"program":["ldi r31,1","ldi r30,4","ldi r19,100","st Z+,r19","ld r1,-Z"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
	{"program":["ldi r29,1","ldi r28,4","ldi r19,100","st Y+,r19","ld r1,-Y"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
	{"program":["ldi r27,1","ldi r26,4","ldi r19,100","st X+,r19","ld r1,-X"],"verify":function(scope){
	    return scope.RF[1] == 100 && scope.RAM[260] == 100;
	}},
    ],
    "pushpop":[
	{"program":["ldi r31,15","ldi r16,255","push r16","push r31","pop r0","push r31","push r0","pop r1","pop r2","pop r3"],"verify":function(scope){
	    return scope.RF[31] == 15 && scope.RF[16] == 255 && scope.RF[0] == 15 && scope.RF[1] == 15 && scope.RF[2] == 15 && scope.RF[3] == 255;
	}},
	{"program":["ldi r31,4","out 61,r31","ldi r31,1","out 62,r31","push r0","push r31"],"verify":function(scope){
	    return scope.SPH == 1 && scope.SPL == 2 && scope.RAM[259] == 1;
	}}
    ],
    "rcallret":[
	{"program":["rjmp 2","inc r31","ret","ldi r31,5","rcall -4","rcall -5","rcall -6","nop","nop","nop","nop","nop","nop","nop","nop"],"verify":function(scope){
	    return scope.RF[31] == 8;
	}},
    ],
    "branch":[
	{"program":["ldi r31,1","dec r31","breq 1","ldi r16,200","ldi r17,4"],"verify":function(scope){
	    return scope.RF[31] == 0 && scope.RF[16] == 0 && scope.RF[17] == 4;
	}},
	{"program":["ldi r31,1","dec r31","brne 1","ldi r16,200","ldi r17,4"],"verify":function(scope){
	    return scope.RF[31] == 0 && scope.RF[16] == 200 && scope.RF[17] == 4;
	}},
	{"program":["ldi r31,15","cpi r31,15","brsh 1","ldi r16,200","ldi r17,4"],"verify":function(scope){
	    return scope.RF[31] == 15 && scope.RF[16] == 0 && scope.RF[17] == 4;
	}},
	{"program":["ldi r31,15","cpi r31,15","brlo 1","ldi r16,200","ldi r17,4"],"verify":function(scope){
	    return scope.RF[31] == 15 && scope.RF[16] == 200 && scope.RF[17] == 4;
	}},
    ]
}

var itests = {
    "subi":[
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"ops":[1,2],"result":255,"flags":{"n":1,"c":1,"z":0}},
	{"ops":[2,1],"result":1,"flags":{"n":0,"c":0,"z":0}},
	{"ops":[0,255],"result":1,"flags":{"n":0,"c":1,"z":0}},
	{"ops":[255,55],"result":200,"flags":{"n":1,"c":0,"z":0}}
    ],
    "cpi":[
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"ops":[1,2],"result":1,"flags":{"n":1,"c":1,"z":0}},
	{"ops":[2,1],"result":2,"flags":{"n":0,"c":0,"z":0}},
	{"ops":[0,255],"result":0,"flags":{"n":0,"c":1,"z":0}},
	{"ops":[255,55],"result":255,"flags":{"n":1,"c":0,"z":0}}
    ],
    "andi":[
	{"ops":[0x55,0xaa],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,15],"result":15,"flags":{"n":0,"c":"x","z":0}},
	{"ops":[255,0xf0],"result":0xf0,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0xc0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,255],"result":255,"flags":{"n":1,"c":"x","z":0}}
    ],
    "ori":[
	{"ops":[0x55,0xaa],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,15],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,0xf0],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0xc0],"result":0xc0,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,255],"result":255,"flags":{"n":1,"c":"x","z":0}}
    ],
}

var rtests = {
    "inc":[
	{"op":0,"result":1,"flags":{"n":0,"c":"x","z":0}},
	{"op":1,"result":2,"flags":{"n":0,"c":"x","z":0}},
	{"op":255,"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"op":-1,"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"op":127,"result":128,"flags":{"n":1,"c":"x","z":0}},
    ],
    "dec":[
	{"op":0,"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"op":1,"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"op":255,"result":254,"flags":{"n":1,"c":"x","z":0}},
	{"op":-1,"result":254,"flags":{"n":1,"c":"x","z":0}},
	{"op":128,"result":127,"flags":{"n":0,"c":"x","z":0}},
    ],
    "neg":[
	{"op":0,"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"op":1,"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"op":255,"result":1,"flags":{"n":0,"c":"x","z":0}},
	{"op":-1,"result":1,"flags":{"n":0,"c":"x","z":0}},
	{"op":128,"result":128,"flags":{"n":1,"c":"x","z":0}},
    ],
    "asr":[
	{"op":0,"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"op":1,"result":0,"flags":{"n":0,"c":1,"z":1}},
	{"op":255,"result":255,"flags":{"n":1,"c":1,"z":0}},
	{"op":254,"result":255,"flags":{"n":1,"c":0,"z":0}},
	{"op":128,"result":192,"flags":{"n":1,"c":0,"z":0}},
    ],
    "com":[
	{"op":0,"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"op":1,"result":254,"flags":{"n":1,"c":"x","z":0}},
	{"op":255,"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"op":15,"result":240,"flags":{"n":1,"c":"x","z":0}},
	{"op":128,"result":127,"flags":{"n":0,"c":"x","z":0}},
    ],
}

var rstests = {
    "add":[
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"ops":[255,1],"result":0,"flags":{"n":0,"c":1,"z":1}},
	{"ops":[255,2],"result":1,"flags":{"n":0,"c":1,"z":0}},
	{"ops":[255,0],"result":255,"flags":{"n":1,"c":0,"z":0}},
	{"ops":[0,1],"result":1,"flags":{"n":0,"c":0,"z":0}}
    ],
    "sub":[
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"ops":[1,2],"result":255,"flags":{"n":1,"c":1,"z":0}},
	{"ops":[2,1],"result":1,"flags":{"n":0,"c":0,"z":0}},
	{"ops":[0,255],"result":1,"flags":{"n":0,"c":1,"z":0}},
	{"ops":[255,55],"result":200,"flags":{"n":1,"c":0,"z":0}}
    ],
    "mov":[
	{"ops":[0x55,0xaa],"result":0xaa,"flags":{"n":"x","c":"x","z":"x"}},
	{"ops":[255,15],"result":15,"flags":{"n":"x","c":"x","z":"x"}},
	{"ops":[255,0xf0],"result":0xf0,"flags":{"n":"x","c":"x","z":"x"}},
	{"ops":[0,0xc0],"result":0xc0,"flags":{"n":"x","c":"x","z":"x"}},
	{"ops":[0,0],"result":0,"flags":{"n":"x","c":"x","z":"x"}},
	{"ops":[255,255],"result":255,"flags":{"n":"x","c":"x","z":"x"}}
    ],
    "cp":[
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":0,"z":1}},
	{"ops":[1,2],"result":1,"flags":{"n":1,"c":1,"z":0}},
	{"ops":[2,1],"result":2,"flags":{"n":0,"c":0,"z":0}},
	{"ops":[0,255],"result":0,"flags":{"n":0,"c":1,"z":0}},
	{"ops":[255,55],"result":255,"flags":{"n":1,"c":0,"z":0}}
    ],
    "and":[
	{"ops":[0x55,0xaa],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,15],"result":15,"flags":{"n":0,"c":"x","z":0}},
	{"ops":[255,0xf0],"result":0xf0,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0xc0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,255],"result":255,"flags":{"n":1,"c":"x","z":0}}
    ],
    "or":[
	{"ops":[0x55,0xaa],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,15],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,0xf0],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0xc0],"result":0xc0,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,255],"result":255,"flags":{"n":1,"c":"x","z":0}}
    ],
    "eor":[
	{"ops":[0x55,0xaa],"result":255,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,15],"result":240,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[255,0xf0],"result":0x0f,"flags":{"n":0,"c":"x","z":0}},
	{"ops":[0,0xc0],"result":0xc0,"flags":{"n":1,"c":"x","z":0}},
	{"ops":[0,0],"result":0,"flags":{"n":0,"c":"x","z":1}},
	{"ops":[255,255],"result":0,"flags":{"n":0,"c":"x","z":1}}
    ]
};
module.exports.rstests = rstests;
module.exports.rtests = rtests;
module.exports.itests = itests;
module.exports.otests = otests;
module.exports.asmtests = asmtests;
