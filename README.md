## Synopsis

js-avr is a Javascript-based AVR simulator that can assemble mnemonics
from the AVR ISA as well as a limited amount of assembly language

## Demo

A live demo can be found at 
[http://daniel3735928559.github.io/jsavr/demo.html](http://daniel3735928559.github.io/jsavr/demo.html)

## Code Example

Suppose we are in an angular app with the following controller:

```
app.controller("DemoController", ['$scope',function($scope){
    $scope.prog = "nop";
    $scope.avrcontrol = {};
}]);
```

Then we can embed an instance of the simulator with a line such as: 

```
<sim-avr program="prog" control="avrcontrol" simid="1" template="/jsavr/simavr.html"></sim-avr>
```

## API Reference

When you create an instance of the simulator, you must pass it an
object in its "control" parameter.  This object will be populated with
functions for interacting programmatically with the simulator.
Specifically:

* `get_program()`: Returns the current program.

* `set_program(prog)`: Sets the current program to `prog`.

* `get_PM(addr)`: Returns the encoded value in program memory at the specified address.

* `get_RF()`: Returns the entire contents of the register file as an array.

* `get_RAM(addr)`: Returns the contents of RAM at the specified address.

* `get_other()`: Returns a dictionary with keys: `PC`,`Z`,`C`,`N`,`SPH`,`SPL`,`DDRD`,`PORTD`,PIND` (and their corresponding values).

Additionally, control.linked() is called when these functions are
populated by the directive's `link()` function.  Currently, a
`"jsavr_linked"` Angular event is also emitted at this point, but this
may not remain true in the future.

## License

js-avr is licensed under the [MIT License](http://opensource.org/licenses/MIT).
