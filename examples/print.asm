rjmp start
output_thing:
push r31
ldi r31,255
out 17,r31
ldi r31,0
out 18,r31
pop r31
ori r31,128
out 18,r31
ret

output_char:
push r31
ldi r31,0
rcall output_thing
ldi r31,3
rcall output_thing
mov r31,r16
rcall output_thing
ldi r31,27
rcall output_thing
ldi r31,'C'
rcall output_thing
pop r31
ret

start:

.string(hello) "Hello World!"
ldi r29,hi8(hello)
ldi r28,lo8(hello)
loop_start:
ld r16,Y+
cpi r16,0
breq end_loop
rcall output_char
rjmp loop_start
end_loop:
halt
