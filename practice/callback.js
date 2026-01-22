//callback fucntion

const calculate =  (num1 , num2 , operation)=> {
    return operation(num1 , num2);
}

const result = calculate(3 ,4 ,function (num1 , num2){
    return num1 + num2;

})

console.log(result);